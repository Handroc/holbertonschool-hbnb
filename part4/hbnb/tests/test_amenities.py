from tests.helpers import APITestCase


class TestAmenities(APITestCase):
    def test_create_amenity_success(self):
        response = self.client.post(
            "/api/v1/amenities/",
            json={"name": "WiFi"},
            headers=self.auth_header(self.admin_token),
        )

        self.assertEqual(response.status_code, 201)
        amenity = response.get_json()
        self.assertIn("id", amenity)
        self.assertEqual(amenity["name"], "WiFi")

    def test_create_amenity_duplicate_fails(self):
        first = self.client.post(
            "/api/v1/amenities/",
            json={"name": "Pool"},
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(first.status_code, 201)

        second = self.client.post(
            "/api/v1/amenities/",
            json={"name": "Pool"},
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(second.status_code, 400)

    def test_create_amenity_duplicate_after_trimming_fails(self):
        first = self.client.post(
            "/api/v1/amenities/",
            json={"name": "Pool"},
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(first.status_code, 201)

        second = self.client.post(
            "/api/v1/amenities/",
            json={"name": "  Pool  "},
            headers=self.auth_header(self.admin_token),
        )
        self.assertEqual(second.status_code, 400)

    def test_get_amenities_list(self):
        self.create_amenity("WiFi")
        self.create_amenity("Parking")

        response = self.client.get("/api/v1/amenities/")

        self.assertEqual(response.status_code, 200)
        amenities = response.get_json()
        self.assertGreaterEqual(len(amenities), 2)

    def test_get_amenity_by_id_and_not_found(self):
        amenity = self.create_amenity("Kitchen")

        response_ok = self.client.get(f"/api/v1/amenities/{amenity['id']}")
        self.assertEqual(response_ok.status_code, 200)

        response_nf = self.client.get("/api/v1/amenities/not-existing-id")
        self.assertEqual(response_nf.status_code, 404)

    def test_update_amenity_success(self):
        amenity = self.create_amenity("Aircon")

        response = self.client.put(
            f"/api/v1/amenities/{amenity['id']}",
            json={"name": "A/C"},
            headers=self.auth_header(self.admin_token),
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["name"], "A/C")

    def test_update_amenity_not_found(self):
        response = self.client.put(
            "/api/v1/amenities/not-existing-id",
            json={"name": "Test"},
            headers=self.auth_header(self.admin_token),
        )

        self.assertEqual(response.status_code, 404)
