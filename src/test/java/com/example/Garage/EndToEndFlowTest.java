package com.example.Garage;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDate;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

/**
 * End-to-end API tests: every test drives the real HTTP layer (security, validation,
 * controllers, services, JPA on in-memory H2) the same way the SPA does.
 * Each test creates its own users/garages with unique names and far-apart
 * coordinates so tests never see each other's data.
 */
@SpringBootTest
@AutoConfigureMockMvc
class EndToEndFlowTest {

    private static final AtomicInteger SEQ = new AtomicInteger();

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    // ---------------------------------------------------------------- helpers

    private record Resp(int status, JsonNode body) {}

    private Resp call(MockHttpServletRequestBuilder req, String token, Object body) throws Exception {
        if (token != null) req.header("Authorization", "Bearer " + token);
        if (body != null) req.contentType(MediaType.APPLICATION_JSON).content(
                body instanceof String s ? s : json.writeValueAsString(body));
        MvcResult r = mvc.perform(req).andReturn();
        String text = r.getResponse().getContentAsString();
        JsonNode node = null;
        if (!text.isBlank()) {
            try { node = json.readTree(text); } catch (Exception e) { node = json.getNodeFactory().textNode(text); }
        }
        return new Resp(r.getResponse().getStatus(), node);
    }

    private String uniq(String prefix) {
        return prefix + System.nanoTime() % 1_000_000 + "_" + SEQ.incrementAndGet();
    }

    /** Registers + logs in a user with the given role; returns the JWT. */
    private String user(String role) throws Exception {
        String name = uniq(role.substring(5, 9).toLowerCase());
        Resp reg = call(post("/auth/register"), null, Map.of(
                "username", name, "email", name + "@test.dev", "password", "pass1234",
                "phone", "+919800000000", "roles", new String[]{role}));
        assertThat(reg.status()).as("register " + reg.body()).isEqualTo(200);
        Resp login = call(post("/auth/login"), null, Map.of("username", name, "password", "pass1234"));
        assertThat(login.status()).isEqualTo(200);
        return login.body().get("token").asText();
    }

    private long faultTypeId(String token) throws Exception {
        return call(get("/api/fault-types"), token, null).body().get(0).get("id").asLong();
    }

    private long vehicleTypeId(String token) throws Exception {
        return call(get("/api/vehicle-types"), token, null).body().get(0).get("id").asLong();
    }

    /** Fixture: an owner with one priced garage at a unique location. */
    private class World {
        String owner, customer;
        long garageId, faultTypeId, vehicleTypeId, vehicleId;
        double lat, lng;

        World(int capacity) throws Exception {
            owner = user("ROLE_GARAGE_OWNER");
            customer = user("ROLE_USER");
            faultTypeId = faultTypeId(owner);
            vehicleTypeId = vehicleTypeId(owner);
            // spread fixtures far apart (> 200 km) so nearby searches stay isolated
            int n = SEQ.incrementAndGet();
            lat = -60 + (n % 120);
            lng = -170 + (n * 7 % 340);

            Resp g = call(post("/api/garages"), owner, Map.of("name", uniq("Garage"), "address", "1 Test Rd",
                    "latitude", lat, "longitude", lng, "dailyCapacity", capacity));
            assertThat(g.status()).isEqualTo(200);
            garageId = g.body().get("id").asLong();

            Resp p = call(post("/api/garages/" + garageId + "/prices"), owner,
                    Map.of("faultTypeId", faultTypeId, "vehicleTypeId", vehicleTypeId, "price", 499.0));
            assertThat(p.status()).isEqualTo(200);

            vehicleId = addVehicle(customer);
        }

        long addVehicle(String token) throws Exception {
            Resp v = call(post("/api/vehicles"), token, Map.of("vehicleTypeId", vehicleTypeId, "model", "Swift",
                    "year", 2020, "licensePlate", uniq("KA01")));
            assertThat(v.status()).isEqualTo(200);
            return v.body().get("id").asLong();
        }

        String technician() throws Exception {
            String tech = user("ROLE_GARAGE_MEMBER");
            Resp j = call(post("/api/garage-members/join"), tech, Map.of("garageId", garageId));
            assertThat(j.status()).isEqualTo(200);
            return tech;
        }

        Resp book(String token, long vehicle, LocalDate date) throws Exception {
            return call(post("/api/bookings/place"), token, Map.of("garageId", garageId, "faultTypeId", faultTypeId,
                    "vehicleId", vehicle, "appointmentDate", date.toString(), "serviceAddress", "Near city mall",
                    "serviceLatitude", lat, "serviceLongitude", lng));
        }

        Resp book() throws Exception { return book(customer, vehicleId, LocalDate.now().plusDays(1)); }
    }

    private long unread(String token) throws Exception {
        return call(get("/api/notifications/unread-count"), token, null).body().get("count").asLong();
    }

    private JsonNode notifications(String token) throws Exception {
        return call(get("/api/notifications"), token, null).body();
    }

    // ---------------------------------------------------------------- happy path

    @Test
    void fullCustomerOwnerTechnicianLifecycle() throws Exception {
        World w = new World(5);
        String tech = w.technician();

        // nearby search returns the garage with the fault x vehicle price
        Resp near = call(get("/api/garages/nearby?lat=" + w.lat + "&lng=" + w.lng + "&radiusKm=5&faultTypeId="
                + w.faultTypeId + "&vehicleTypeId=" + w.vehicleTypeId), w.customer, null);
        assertThat(near.status()).isEqualTo(200);
        assertThat(near.body()).hasSize(1);
        assertThat(near.body().get(0).get("price").asDouble()).isEqualTo(499.0);

        // place booking -> auto-assigned to the only technician
        Resp b = w.book();
        assertThat(b.status()).as(String.valueOf(b.body())).isEqualTo(200);
        long id = b.body().get("id").asLong();
        assertThat(b.body().get("status").asText()).isEqualTo("ASSIGNED");
        assertThat(b.body().get("quotedPrice").asDouble()).isEqualTo(499.0);
        assertThat(b.body().get("technicianName").asText()).isNotBlank();

        // technician sees the job with customer contact info
        Resp jobs = call(get("/api/jobs/assigned"), tech, null);
        assertThat(jobs.body()).hasSize(1);
        assertThat(jobs.body().get(0).get("customerPhone").asText()).isEqualTo("+919800000000");

        // cannot complete before accepting
        assertThat(call(patch("/api/jobs/" + id + "/complete"), tech, null).status()).isEqualTo(409);
        assertThat(call(patch("/api/jobs/" + id + "/accept"), tech, null).body().get("status").asText()).isEqualTo("IN_PROGRESS");
        // cannot rate before completion
        assertThat(call(post("/api/bookings/" + id + "/rate"), w.customer, Map.of("rating", 5)).status()).isEqualTo(409);
        assertThat(call(patch("/api/jobs/" + id + "/complete"), tech, null).body().get("status").asText()).isEqualTo("COMPLETED");

        Resp me = call(get("/api/garage-members/me"), tech, null);
        assertThat(me.body().get("activeJobs").asInt()).isZero();

        Resp rated = call(post("/api/bookings/" + id + "/rate"), w.customer, Map.of("rating", 4, "comment", "Quick fix"));
        assertThat(rated.status()).isEqualTo(200);
        assertThat(rated.body().get("status").asText()).isEqualTo("RATED");
        // rating twice is rejected
        assertThat(call(post("/api/bookings/" + id + "/rate"), w.customer, Map.of("rating", 1)).status()).isEqualTo(409);

        // ratings roll up to technician + garage, and leaderboard
        assertThat(call(get("/api/garage-members/me"), tech, null).body().get("rating").asDouble()).isEqualTo(4.0);
        JsonNode garage = call(get("/api/garages/my"), w.owner, null).body().get(0);
        assertThat(garage.get("rating").asDouble()).isEqualTo(4.0);
        JsonNode board = call(get("/api/garages/" + w.garageId + "/leaderboard"), w.owner, null).body();
        assertThat(board).hasSize(1);
        assertThat(board.get(0).get("rank").asInt()).isEqualTo(1);
        assertThat(board.get(0).get("jobsRatedThisMonth").asInt()).isEqualTo(1);
        assertThat(board.get(0).get("technicianName").asText()).isNotBlank();

        // notifications: customer got assigned / started / completed
        assertThat(notifications(w.customer).size()).isGreaterThanOrEqualTo(3);
        assertThat(unread(w.customer)).isGreaterThanOrEqualTo(3);
        assertThat(call(patch("/api/notifications/read-all"), w.customer, null).status()).isEqualTo(200);
        assertThat(unread(w.customer)).isZero();
    }

    // ---------------------------------------------------------------- assignment

    @Test
    void noTechnicianLeavesBookingUnassignedAndOwnerCanAssignLater() throws Exception {
        World w = new World(5);
        Resp b = w.book();
        assertThat(b.body().get("status").asText()).isEqualTo("UNASSIGNED");
        long id = b.body().get("id").asLong();
        assertThat(unread(w.owner)).isEqualTo(1);

        // reassign with nobody available stays unassigned
        assertThat(call(patch("/api/bookings/" + id + "/reassign"), w.owner, null).body().get("status").asText())
                .isEqualTo("UNASSIGNED");

        // a technician joins -> the waiting booking is dispatched to them automatically
        String tech = w.technician();
        JsonNode jobs = call(get("/api/jobs/assigned"), tech, null).body();
        assertThat(jobs).hasSize(1);
        assertThat(jobs.get(0).get("status").asText()).isEqualTo("ASSIGNED");

        // owner can no longer reassign an assigned booking
        assertThat(call(patch("/api/bookings/" + id + "/reassign"), w.owner, null).status()).isEqualTo(409);
    }

    @Test
    void manualAssignRejectsTechnicianFromAnotherGarage() throws Exception {
        World w = new World(5);
        World other = new World(5);
        String foreignTech = other.technician();
        long foreignMemberId = call(get("/api/garage-members/me"), foreignTech, null).body().get("id").asLong();

        long id = w.book().body().get("id").asLong();
        Resp r = call(patch("/api/bookings/" + id + "/assign?technicianId=" + foreignMemberId), w.owner, null);
        assertThat(r.status()).isEqualTo(403);
        // and another owner cannot touch this booking at all
        assertThat(call(patch("/api/bookings/" + id + "/reassign"), other.owner, null).status()).isEqualTo(403);
    }

    @Test
    void offlineTechnicianPicksUpWaitingBookingWhenGoingOnline() throws Exception {
        World w = new World(5);
        String tech = w.technician();
        assertThat(call(patch("/api/garage-members/me/availability?available=false"), tech, null).status()).isEqualTo(200);

        long id = w.book().body().get("id").asLong();
        assertThat(call(get("/api/bookings/my"), w.customer, null).body().get(0).get("status").asText()).isEqualTo("UNASSIGNED");

        call(patch("/api/garage-members/me/availability?available=true"), tech, null);
        JsonNode jobs = call(get("/api/jobs/assigned"), tech, null).body();
        assertThat(jobs).hasSize(1);
        assertThat(jobs.get(0).get("id").asLong()).isEqualTo(id);
        assertThat(jobs.get(0).get("status").asText()).isEqualTo("ASSIGNED");
    }

    @Test
    void busyTechnicianQueuesExtraBookingsAndPicksNextUpOnCompletion() throws Exception {
        World w = new World(20);
        String tech = w.technician();
        long[] ids = new long[4];
        for (int i = 0; i < 4; i++) {
            Resp r = w.book(w.customer, w.addVehicle(w.customer), LocalDate.now().plusDays(1));
            assertThat(r.status()).isEqualTo(200);
            ids[i] = r.body().get("id").asLong();
            // default cap is 3 active jobs: the 4th waits in the queue
            assertThat(r.body().get("status").asText()).isEqualTo(i < 3 ? "ASSIGNED" : "UNASSIGNED");
        }
        assertThat(call(get("/api/garage-members/me"), tech, null).body().get("activeJobs").asInt()).isEqualTo(3);

        call(patch("/api/jobs/" + ids[0] + "/accept"), tech, null);
        call(patch("/api/jobs/" + ids[0] + "/complete"), tech, null);

        // finishing a job frees a slot -> the queued booking is dispatched automatically
        JsonNode mine = call(get("/api/bookings/my"), w.customer, null).body();
        for (JsonNode b : mine) {
            if (b.get("id").asLong() == ids[3]) assertThat(b.get("status").asText()).isEqualTo("ASSIGNED");
        }
        assertThat(call(get("/api/garage-members/me"), tech, null).body().get("activeJobs").asInt()).isEqualTo(3);
    }

    @Test
    void secondTechnicianShareLoadOnceTopTechnicianIsFull() throws Exception {
        World w = new World(20);
        w.technician();
        String second = w.technician();
        for (int i = 0; i < 4; i++) w.book(w.customer, w.addVehicle(w.customer), LocalDate.now().plusDays(1));
        // both start at rating 0; ties are broken by workload, so jobs alternate between them
        assertThat(call(get("/api/jobs/assigned"), second, null).body()).hasSize(2);
    }

    @Test
    void technicianCannotActOnSomeoneElsesJob() throws Exception {
        World w = new World(5);
        w.technician();
        long id = w.book().body().get("id").asLong();

        World other = new World(5);
        String stranger = other.technician();
        assertThat(call(patch("/api/jobs/" + id + "/accept"), stranger, null).status()).isEqualTo(403);
        // customers cannot use technician endpoints
        assertThat(call(patch("/api/jobs/" + id + "/accept"), w.customer, null).status()).isEqualTo(403);
    }

    // ---------------------------------------------------------------- booking rules

    @Test
    void garageCapacityIsEnforcedAndCancelledBookingsFreeTheSlot() throws Exception {
        World w = new World(1);
        LocalDate date = LocalDate.now().plusDays(2);
        Resp first = w.book(w.customer, w.vehicleId, date);
        assertThat(first.status()).isEqualTo(200);

        long secondVehicle = w.addVehicle(w.customer);
        Resp full = w.book(w.customer, secondVehicle, date);
        assertThat(full.status()).isEqualTo(409);
        assertThat(full.body().get("error").asText()).contains("Slot unavailable");

        call(patch("/api/bookings/" + first.body().get("id").asLong() + "/cancel"), w.customer, null);
        assertThat(w.book(w.customer, secondVehicle, date).status()).isEqualTo(200);
    }

    @Test
    void cannotBookForPastDate() throws Exception {
        World w = new World(5);
        Resp r = w.book(w.customer, w.vehicleId, LocalDate.now().minusDays(3));
        assertThat(r.status()).isEqualTo(400);
    }

    @Test
    void sameDayBookingIsAllowed() throws Exception {
        World w = new World(5);
        assertThat(w.book(w.customer, w.vehicleId, LocalDate.now()).status()).isEqualTo(200);
    }

    @Test
    void cannotDoubleBookTheSameVehicleWhileAJobIsActive() throws Exception {
        World w = new World(5);
        assertThat(w.book().status()).isEqualTo(200);
        Resp dup = w.book();
        assertThat(dup.status()).isEqualTo(409);
        assertThat(dup.body().get("error").asText()).containsIgnoringCase("active booking");
    }

    @Test
    void cannotBookWithSomeoneElsesVehicle() throws Exception {
        World w = new World(5);
        String intruder = user("ROLE_USER");
        assertThat(w.book(intruder, w.vehicleId, LocalDate.now().plusDays(1)).status()).isEqualTo(403);
    }

    @Test
    void bookingRequiresGarageToPriceTheVehicleType() throws Exception {
        World w = new World(5);
        long otherType = call(get("/api/vehicle-types"), w.owner, null).body().get(1).get("id").asLong();
        long bike = call(post("/api/vehicles"), w.customer, Map.of("vehicleTypeId", otherType)).body().get("id").asLong();
        assertThat(w.book(w.customer, bike, LocalDate.now().plusDays(1)).status()).isEqualTo(404);
    }

    @Test
    void ownerCancellationNotifiesCustomerAndTechnicianAndFreesTechnician() throws Exception {
        World w = new World(5);
        String tech = w.technician();
        long id = w.book().body().get("id").asLong();
        assertThat(call(get("/api/garage-members/me"), tech, null).body().get("activeJobs").asInt()).isEqualTo(1);
        long techUnreadBefore = unread(tech);

        Resp c = call(patch("/api/bookings/" + id + "/cancel"), w.owner, null);
        assertThat(c.body().get("status").asText()).isEqualTo("CANCELLED");
        assertThat(call(get("/api/garage-members/me"), tech, null).body().get("activeJobs").asInt()).isZero();
        assertThat(unread(tech)).isEqualTo(techUnreadBefore + 1);
        assertThat(notifications(w.customer).get(0).get("message").asText()).contains("cancelled by the garage");

        // cancelling twice is an invalid transition
        assertThat(call(patch("/api/bookings/" + id + "/cancel"), w.owner, null).status()).isEqualTo(409);
    }

    @Test
    void strangersCannotCancelOrRateOrViewGarageBookings() throws Exception {
        World w = new World(5);
        long id = w.book().body().get("id").asLong();
        String stranger = user("ROLE_USER");
        String otherOwner = user("ROLE_GARAGE_OWNER");
        assertThat(call(patch("/api/bookings/" + id + "/cancel"), stranger, null).status()).isEqualTo(403);
        assertThat(call(post("/api/bookings/" + id + "/rate"), stranger, Map.of("rating", 5)).status()).isEqualTo(403);
        assertThat(call(get("/api/bookings/garage/" + w.garageId), otherOwner, null).status()).isEqualTo(403);
        assertThat(call(post("/api/garages/" + w.garageId + "/prices"), otherOwner,
                Map.of("faultTypeId", w.faultTypeId, "vehicleTypeId", w.vehicleTypeId, "price", 1.0)).status()).isEqualTo(403);
    }

    // ---------------------------------------------------------------- auth & error handling

    @Test
    void registrationValidation() throws Exception {
        String name = uniq("dup");
        Map<String, Object> body = Map.of("username", name, "email", name + "@x.dev", "password", "pass1234",
                "phone", "+919800000000", "roles", new String[]{"ROLE_USER"});
        assertThat(call(post("/auth/register"), null, body).status()).isEqualTo(200);
        assertThat(call(post("/auth/register"), null, body).status()).isEqualTo(400);

        String n2 = uniq("bad");
        assertThat(call(post("/auth/register"), null, Map.of("username", n2, "email", n2 + "@x.dev", "password", "pass1234",
                "phone", "12", "roles", new String[]{"ROLE_USER"})).status()).isEqualTo(400);
        assertThat(call(post("/auth/register"), null, Map.of("username", n2, "email", n2 + "@x.dev", "password", "pass1234",
                "phone", "+919800000000", "roles", new String[]{"ROLE_ADMIN"})).status()).isEqualTo(400);
    }

    @Test
    void wrongPasswordIs401() throws Exception {
        assertThat(call(post("/auth/login"), null, Map.of("username", "nobody", "password", "x")).status()).isEqualTo(401);
    }

    @Test
    void missingOrInvalidTokenIs401SoTheSpaCanRedirectToLogin() throws Exception {
        assertThat(call(get("/api/bookings/my"), null, null).status()).isEqualTo(401);
        assertThat(call(get("/api/bookings/my"), "not-a-jwt", null).status()).isEqualTo(401);
    }

    @Test
    void missingStaticFileIs404Not500() throws Exception {
        assertThat(call(get("/favicon.ico"), null, null).status()).isEqualTo(404);
        assertThat(call(get("/js/does-not-exist.js"), null, null).status()).isEqualTo(404);
    }

    @Test
    void frontendShellAndScriptsAreServedWithoutLogin() throws Exception {
        assertThat(call(get("/"), null, null).status()).isEqualTo(200);
        assertThat(call(get("/css/styles.css"), null, null).status()).isEqualTo(200);
        assertThat(call(get("/js/components/Icon.js"), null, null).status()).isEqualTo(200);
        assertThat(call(get("/js/lib/format.js"), null, null).status()).isEqualTo(200);
    }

    @Test
    void wrongRoleIs403() throws Exception {
        String customer = user("ROLE_USER");
        assertThat(call(post("/api/garages"), customer, Map.of("name", "x", "address", "y", "latitude", 1,
                "longitude", 1, "dailyCapacity", 1)).status()).isEqualTo(403);
    }

    @Test
    void malformedRequestsAre400Not500() throws Exception {
        World w = new World(5);
        assertThat(call(post("/api/bookings/place"), w.customer, "{not json").status()).isEqualTo(400);
        assertThat(call(post("/api/bookings/place"), w.customer, Map.of("garageId", w.garageId, "faultTypeId", 1,
                "vehicleId", w.vehicleId, "appointmentDate", "31-12-2030", "serviceAddress", "x")).status()).isEqualTo(400);
        assertThat(call(get("/api/garages/" + w.garageId + "/leaderboard?month=garbage"), w.owner, null).status()).isEqualTo(400);
        assertThat(call(patch("/api/bookings/1/assign"), w.owner, null).status()).isEqualTo(400);
        assertThat(call(get("/api/garages/nearby?lat=abc&lng=1"), w.customer, null).status()).isEqualTo(400);
    }

    @Test
    void garageInputValidation() throws Exception {
        String owner = user("ROLE_GARAGE_OWNER");
        assertThat(call(post("/api/garages"), owner, Map.of("name", "x", "address", "y", "latitude", 12,
                "longitude", 77, "dailyCapacity", 0)).status()).isEqualTo(400);
        assertThat(call(post("/api/garages"), owner, Map.of("name", "x", "address", "y", "latitude", 120,
                "longitude", 77, "dailyCapacity", 3)).status()).isEqualTo(400);
    }

    @Test
    void profileUpdateAndNotificationOwnership() throws Exception {
        World w = new World(5);
        w.book(); // owner gets an "unassigned" notification
        long notifId = notifications(w.owner).get(0).get("id").asLong();
        assertThat(call(patch("/api/notifications/" + notifId + "/read"), w.customer, null).status()).isEqualTo(403);
        assertThat(call(patch("/api/notifications/" + notifId + "/read"), w.owner, null).status()).isEqualTo(200);

        String email = uniq("new") + "@x.dev";
        Resp upd = call(put("/api/users/me"), w.customer, Map.of("email", email, "phone", "+919811111111",
                "nationality", "Indian", "residentialAddress", "Pune"));
        assertThat(upd.status()).isEqualTo(200);
        assertThat(call(get("/api/users/me"), w.customer, null).body().get("email").asText()).isEqualTo(email);
    }
}
