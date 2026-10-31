"""
Phase 12 Automated Verification: Intelligent Nearest Branch Discovery & Geographic Coverage Engine.

Tests:
1. Haversine distance calculation (WGS-84 accuracy, identical coords, None handling).
2. Administrative centroid resolution (local level centroids, district fallback, unresolved).
3. Candidate ranking & Priority hierarchy:
   - Priority 1: Exact local level match.
   - Priority 2: District hub fallback.
   - Priority 3: Cross-district nearby discovery.
   - Priority 0: Explicit unavailable when no branches.
4. Live serviceability vs Physical proximity (serviceable branch outranks closer unserviceable one).
5. Distance labels strictly marked 'Approx. distance'.
6. Admin branch management API (GET filtering, PATCH coordinate updates with audit logs).
"""

from decimal import Decimal
from unittest.mock import patch
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework import status

from core.models import User
from marketplace.models import (
    NCMConfiguration, NCMBranchRecord, NCMBranchCoordinateAuditLog,
)
from marketplace.nepal_geography import (
    calculate_haversine_distance,
    get_municipality_centroid,
    find_local_level_match,
)
from marketplace.ncm_service import (
    NCMService,
    discover_nearest_ncm_branches,
    match_ncm_branches_for_location,
)


class NCMPhase12NearestBranchTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(
            username="admin_geo",
            email="admin_geo@loksewa.com",
            password="adminpassword123",
            role="admin",
            is_staff=True,
            is_superuser=True,
        )
        self.student_user = User.objects.create_user(
            username="student_geo",
            email="student_geo@loksewa.com",
            password="studentpassword123",
            role="student",
        )

        self.config = NCMConfiguration.objects.create(
            is_enabled=True,
            environment="demo",
            custom_base_url="https://demo.nepalcanmove.com/api/",
            custom_api_token="test_demo_token_geo",
            default_origin_branch="Kathmandu Hub",
            fallback_rules_enabled=True,
        )

        self.mock_branches = [
            {
                "code": "KTM01",
                "name": "Kathmandu Hub",
                "district_name": "Kathmandu",
                "province_name": "Bagmati Province",
                "municipality": "Kathmandu Metropolitan City",
                "address": "Putalisadak, Kathmandu",
                "contact_number": "01-4444444",
                "areas_covered": ["Putalisadak", "Dillibazar", "Thamel", "Baneshwor"],
                "latitude": 27.7172,
                "longitude": 85.3240,
                "is_serviceable": True,
            },
            {
                "code": "BHT01",
                "name": "Bharatpur Main Branch",
                "district_name": "Chitwan",
                "province_name": "Bagmati Province",
                "municipality": "Bharatpur Metropolitan City",
                "address": "Lions Chowk, Bharatpur",
                "contact_number": "056-521111",
                "areas_covered": ["Lions Chowk", "Narayangarh", "Chaubiskothi"],
                "latitude": 27.6833,
                "longitude": 84.4333,
                "is_serviceable": True,
            },
            {
                "code": "GAU01",
                "name": "Gaindakot Service Point",
                "district_name": "Nawalparasi East",
                "province_name": "Gandaki Province",
                "municipality": "Gaindakot Municipality",
                "address": "Gaindakot-1, Nawalpur",
                "contact_number": "078-501111",
                "areas_covered": ["Gaindakot Bazar", "Thumsi"],
                "latitude": 27.7050,
                "longitude": 84.4150,
                "is_serviceable": True,
            },
            {
                "code": "PKR01",
                "name": "Pokhara Hub",
                "district_name": "Kaski",
                "province_name": "Gandaki Province",
                "municipality": "Pokhara Metropolitan City",
                "address": "New Road, Pokhara",
                "contact_number": "061-531111",
                "areas_covered": ["New Road", "Lakeside", "Mahendrapool"],
                "latitude": 28.2096,
                "longitude": 83.9856,
                "is_serviceable": True,
            },
            {
                "code": "UNS01",
                "name": "Damaged Outpost (Closed)",
                "district_name": "Chitwan",
                "province_name": "Bagmati Province",
                "municipality": "Bharatpur Metropolitan City",
                "address": "Remote Road, Chitwan",
                "contact_number": "056-000000",
                "areas_covered": ["Narayangarh"],
                "latitude": 27.6840,
                "longitude": 84.4340,
                "is_serviceable": False,  # Road closed/suspended
            },
        ]

    # --------------------------------------------------------------------------
    # 1. Geographic Foundation & Distance Formula
    # --------------------------------------------------------------------------

    def test_haversine_formula_known_coordinates(self):
        """Kathmandu to Pokhara is ~142.4 km great-circle distance."""
        dist = calculate_haversine_distance(27.7172, 85.3240, 28.2096, 83.9856)
        self.assertIsNotNone(dist)
        self.assertAlmostEqual(dist, 142.4, delta=1.0)

    def test_haversine_same_point_zero(self):
        """Identical coordinates return 0.0 km."""
        dist = calculate_haversine_distance(27.7172, 85.3240, 27.7172, 85.3240)
        self.assertAlmostEqual(dist, 0.0, places=2)

    def test_haversine_invalid_or_none_graceful(self):
        """Missing or invalid coordinates return None safely."""
        self.assertIsNone(calculate_haversine_distance(None, 85.0, 27.0, 84.0))
        self.assertIsNone(calculate_haversine_distance("invalid", 85.0, 27.0, 84.0))
        self.assertIsNone(calculate_haversine_distance(999.0, 85.0, 27.0, 84.0))

    def test_get_municipality_centroid_exact_local_level(self):
        """Resolves known local level to municipality centroid."""
        lat, lon, src, info = get_municipality_centroid("Bharatpur", "Chitwan")
        self.assertIsNotNone(lat)
        self.assertIsNotNone(lon)
        self.assertEqual(src, "municipality_centroid")
        self.assertAlmostEqual(lat, 27.6833, delta=0.1)

    def test_get_municipality_centroid_district_fallback(self):
        """Unknown local level in known district falls back to district reference."""
        lat, lon, src, info = get_municipality_centroid("Unknown Village Area", "Chitwan")
        self.assertIsNotNone(lat)
        self.assertEqual(src, "district_reference")

    def test_get_municipality_centroid_unresolved(self):
        """Completely unknown location returns unresolved."""
        lat, lon, src, info = get_municipality_centroid("Unknown Area", "NonExistentDistrict")
        self.assertIsNone(lat)
        self.assertEqual(src, "unresolved")

    # --------------------------------------------------------------------------
    # 2. Strict Search Priority & Candidate Ranking
    # --------------------------------------------------------------------------

    def test_nearest_ranking_priority_1_local_level(self):
        """Local-level match ranks Priority 1 and includes approx distance."""
        res = discover_nearest_ncm_branches(
            self.mock_branches,
            municipality="Gaindakot",
            district="Nawalparasi East",
        )
        self.assertEqual(res["match_priority"], 1)
        self.assertEqual(res["match_type"], "municipality")
        self.assertIsNotNone(res["recommended_branch"])
        self.assertEqual(res["recommended_branch"]["code"], "GAU01")
        self.assertIn("(Approx. distance)", res["recommended_branch"]["distance_label"])

    def test_nearest_ranking_priority_2_district(self):
        """District fallback when local level has no direct match."""
        res = discover_nearest_ncm_branches(
            self.mock_branches,
            municipality="Madi",
            district="Chitwan",
        )
        self.assertEqual(res["match_priority"], 2)
        self.assertEqual(res["match_type"], "district")
        self.assertIsNotNone(res["recommended_branch"])
        # Should recommend serviceable Bharatpur branch, NOT unserviceable UNS01
        self.assertEqual(res["recommended_branch"]["code"], "BHT01")

    def test_nearest_ranking_priority_3_cross_district_nearby(self):
        """Cross-district nearby branch discovered when allow_nearby is True."""
        # Nawalparasi East student in Devchuli (no branch in Devchuli or Nawalpur in mock except Gaindakot)
        # Search for a location in Nawalparasi West where only nearby Chitwan branch exists
        res = discover_nearest_ncm_branches(
            self.mock_branches,
            municipality="Sunwal",
            district="Nawalparasi West",
            allow_nearby=True,
        )
        self.assertEqual(res["match_priority"], 3)
        self.assertEqual(res["match_type"], "nearby")
        self.assertIsNotNone(res["recommended_branch"])
        self.assertTrue(len(res["suggested_branches"]) > 0)

    def test_serviceability_outranks_physical_proximity(self):
        """Serviceable branch outranks physically closer unserviceable branch."""
        # Unserviceable UNS01 is at (27.6840, 84.4340) - very close to Lions Chowk
        # Serviceable BHT01 is at (27.6833, 84.4333)
        res = discover_nearest_ncm_branches(
            self.mock_branches,
            municipality="Bharatpur",
            district="Chitwan",
        )
        self.assertEqual(res["recommended_branch"]["code"], "BHT01")
        self.assertTrue(res["recommended_branch"]["is_serviceable"])

    def test_unserviceable_branch_never_recommended(self):
        """An unserviceable branch is never marked is_recommended = True."""
        res = discover_nearest_ncm_branches(
            [self.mock_branches[4]],  # Only UNS01 (is_serviceable = False)
            municipality="Bharatpur",
            district="Chitwan",
        )
        self.assertIsNone(res["recommended_branch"])
        self.assertIsNone(res["auto_selected"])

    def test_distance_label_strictly_approximate(self):
        """Distance labels must strictly specify '(Approx. distance)'."""
        res = discover_nearest_ncm_branches(
            self.mock_branches,
            municipality="Kathmandu",
            district="Kathmandu",
        )
        rec = res["recommended_branch"]
        self.assertIn("Approx. distance", rec["distance_label"])
        self.assertNotIn("driving distance", rec["distance_label"].lower())
        self.assertNotIn("road distance", rec["distance_label"].lower())

    # --------------------------------------------------------------------------
    # 3. Database Sync & Admin Management
    # --------------------------------------------------------------------------

    def test_branch_db_sync_preserves_admin_verified_coordinates(self):
        """Syncing branches to DB does not overwrite admin verified coordinates."""
        service = NCMService()

        # Admin created or verified branch
        rec = NCMBranchRecord.objects.create(
            code="BHT01",
            name="Bharatpur Main Branch",
            district_name="Chitwan",
            latitude=Decimal("27.699999"),
            longitude=Decimal("84.444444"),
            coordinate_source="ADMIN_VERIFIED",
            is_coordinate_verified=True,
            is_serviceable=True,
        )

        # Service syncs from API (which may have different coordinates)
        service.sync_branches_to_db(self.mock_branches)

        rec.refresh_from_db()
        # Admin coordinates must remain intact
        self.assertEqual(rec.latitude, Decimal("27.699999"))
        self.assertEqual(rec.longitude, Decimal("84.444444"))
        self.assertEqual(rec.coordinate_source, "ADMIN_VERIFIED")
        self.assertTrue(rec.is_coordinate_verified)

    def test_admin_branch_view_filtering(self):
        """Admin can filter branches by search query and serviceability."""
        self.client.force_authenticate(user=self.admin_user)
        service = NCMService()
        service.sync_branches_to_db(self.mock_branches)

        # Search for Chitwan
        res = self.client.get("/api/marketplace/admin/courier/branches/?search=Chitwan")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertGreaterEqual(data["count"], 1)

        # Filter unserviceable
        res_un = self.client.get("/api/marketplace/admin/courier/branches/?status=unserviceable")
        self.assertEqual(res_un.status_code, status.HTTP_200_OK)
        data_un = res_un.json()
        self.assertTrue(any(b["code"] == "UNS01" for b in data_un["branches"]))

    def test_admin_patch_branch_coordinates_and_audit_log(self):
        """Admin updates branch coordinates via PATCH and audit log is created."""
        self.client.force_authenticate(user=self.admin_user)
        rec = NCMBranchRecord.objects.create(
            code="TEST_BRANCH",
            name="Test Branch",
            district_name="Kaski",
            is_serviceable=True,
            coordinate_source="UNVERIFIED",
        )

        patch_data = {
            "id": rec.id,
            "latitude": 28.212345,
            "longitude": 83.987654,
            "coordinate_source": "ADMIN_VERIFIED",
            "is_coordinate_verified": True,
            "is_serviceable": True,
            "reason": "GPS coordinates verified from physical office visit",
        }
        res = self.client.patch("/api/marketplace/admin/courier/branches/", patch_data, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        rec.refresh_from_db()
        self.assertEqual(rec.latitude, Decimal("28.212345"))
        self.assertEqual(rec.longitude, Decimal("83.987654"))
        self.assertEqual(rec.coordinate_source, "ADMIN_VERIFIED")
        self.assertTrue(rec.is_coordinate_verified)

        # Audit log verification
        log = NCMBranchCoordinateAuditLog.objects.filter(branch=rec).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.changed_by, self.admin_user)
        self.assertEqual(log.new_latitude, Decimal("28.212345"))
        self.assertEqual(log.new_source, "ADMIN_VERIFIED")
        self.assertIn("GPS coordinates verified", log.reason)

    def test_admin_patch_requires_admin_permissions(self):
        """Non-admin cannot PATCH branch coordinates."""
        self.client.force_authenticate(user=self.student_user)
        res = self.client.patch("/api/marketplace/admin/courier/branches/", {"id": 1})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
