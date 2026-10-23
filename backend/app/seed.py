import json
import datetime
from sqlalchemy.orm import Session
from backend.app.models.user import User
from backend.app.models.donor import Donor
from backend.app.models.blood_request import BloodRequest
from backend.app.models.response import BloodRequestResponse
from backend.app.models.donation import DonationRecord
from backend.app.models.center import BloodCenter
from backend.app.models.inventory import InventoryItem
from backend.app.models.notification import AppNotification
from backend.app.auth.security import get_password_hash

INITIAL_USERS = [
    {
        "id": "user-1",
        "name": "Rahim Ahmed",
        "email": "rahim.ahmed@demo.lifora.org",
        "role": "donor",
        "blood_group": "B+",
        "city": "Sylhet",
        "location": "Zindabazar",
        "phone": "+880 1711-234567",
        "total_donations": 8,
        "last_donation": "2026-06-12",
        "availability": "Available"
    },
    {
        "id": "user-req-1",
        "name": "Nusrat Jahan",
        "email": "nusrat.jahan@demo.lifora.org",
        "role": "requester",
        "blood_group": "O+",
        "city": "Sylhet",
        "location": "Amberkhana",
        "phone": "+880 1819-345678",
        "total_donations": 5,
        "last_donation": "2026-05-18",
        "availability": "Available"
    },
    {
        "id": "user-admin-1",
        "name": "Dr. Masud Rana",
        "email": "admin.transfusion@osmani.lifora.org",
        "role": "admin",
        "blood_group": "O-",
        "city": "Sylhet",
        "location": "Osmani Medical Road",
        "phone": "+880 821-713667",
        "total_donations": 12,
        "last_donation": "2026-04-10",
        "availability": "Available"
    },
    {
        "id": "user-standard-donor",
        "name": "Standard Voluntary Donor",
        "email": "donor@lifora.org",
        "role": "donor",
        "blood_group": "O+",
        "city": "Sylhet",
        "location": "Subidbazar",
        "phone": "+880 1700-111222",
        "total_donations": 4,
        "last_donation": "2026-05-01",
        "availability": "Available"
    },
    {
        "id": "user-standard-requester",
        "name": "Standard Family Requester",
        "email": "requester@lifora.org",
        "role": "requester",
        "blood_group": "A+",
        "city": "Sylhet",
        "location": "Upashahar",
        "phone": "+880 1800-333444",
        "total_donations": 0,
        "availability": "Available"
    },
    {
        "id": "user-standard-admin",
        "name": "Platform Super Administrator",
        "email": "admin@lifora.org",
        "role": "admin",
        "blood_group": "AB+",
        "city": "Sylhet",
        "location": "Sylhet Central",
        "phone": "+880 1900-555666",
        "total_donations": 15,
        "availability": "Available"
    }
]

INITIAL_DONORS_DATA = [
    {
        "id": "donor-1",
        "name": "Rahim Ahmed",
        "email": "rahim.ahmed@demo.lifora.org",
        "blood_group": "B+",
        "location": "Zindabazar, Sylhet",
        "city": "Sylhet",
        "distance_km": 1.2,
        "availability": "Available",
        "match_percentage": 98,
        "last_donation_date": "2026-06-12",
        "total_donations": 8,
        "phone": "+880 1711-234567",
        "verified": True,
        "bio": "Certified voluntary whole-blood donor. On call for emergency transfusions in Sylhet city."
    },
    {
        "id": "donor-2",
        "name": "Fatima Begum",
        "email": "fatima.begum@lifora.org",
        "blood_group": "O-",
        "location": "Amberkhana, Sylhet",
        "city": "Sylhet",
        "distance_km": 2.4,
        "availability": "Available",
        "match_percentage": 96,
        "last_donation_date": "2026-05-20",
        "total_donations": 11,
        "phone": "+880 1712-345678",
        "verified": True,
        "bio": "Universal red-cell donor. Active member of Sylhet Voluntary Blood Society."
    },
    {
        "id": "donor-3",
        "name": "Tanvir Hasan",
        "email": "tanvir.hasan@lifora.org",
        "blood_group": "A+",
        "location": "Subidbazar, Sylhet",
        "city": "Sylhet",
        "distance_km": 3.1,
        "availability": "Available",
        "match_percentage": 94,
        "last_donation_date": "2026-04-18",
        "total_donations": 6,
        "phone": "+880 1713-456789",
        "verified": True,
        "bio": "Regular platelet and whole-blood donor. Readily available for ICU calls."
    },
    {
        "id": "donor-4",
        "name": "Nusrat Jahan",
        "email": "nusrat.jahan@demo.lifora.org",
        "blood_group": "O+",
        "location": "Shibgonj, Sylhet",
        "city": "Sylhet",
        "distance_km": 1.8,
        "availability": "Available",
        "match_percentage": 97,
        "last_donation_date": "2026-05-18",
        "total_donations": 5,
        "phone": "+880 1819-345678",
        "verified": True,
        "bio": "Active community organizer and regular whole-blood donor."
    },
    {
        "id": "donor-5",
        "name": "Kamrul Islam",
        "email": "kamrul.islam@lifora.org",
        "blood_group": "AB+",
        "location": "Upashahar, Sylhet",
        "city": "Sylhet",
        "distance_km": 4.0,
        "availability": "Available",
        "match_percentage": 92,
        "last_donation_date": "2026-03-30",
        "total_donations": 9,
        "phone": "+880 1715-678901",
        "verified": True,
        "bio": "Universal recipient type with plasma donor qualification."
    },
    {
        "id": "donor-6",
        "name": "Sadia Akter",
        "email": "sadia.akter@lifora.org",
        "blood_group": "A-",
        "location": "Mirabazar, Sylhet",
        "city": "Sylhet",
        "distance_km": 2.1,
        "availability": "Available",
        "match_percentage": 95,
        "last_donation_date": "2026-06-02",
        "total_donations": 4,
        "phone": "+880 1716-789012",
        "verified": True,
        "bio": "Committed voluntary donor ready for high-urgency obstetric and trauma calls."
    }
]

INITIAL_REQUESTS_DATA = [
    {
        "id": "req-1",
        "patient_name": "Salma Begum",
        "blood_group": "B+",
        "units_needed": 2,
        "hospital_name": "MAG Osmani Medical College Hospital",
        "city": "Sylhet",
        "urgency": "Critical",
        "deadline": "Within 2 hours",
        "reason": "Emergency surgery for severe road traffic injury. Immediate whole blood transfusion required.",
        "status": "In Progress",
        "contact_person": "Md. Rafiqul Islam (Son)",
        "contact_phone": "+880 1711-987654",
        "responses_count": 1
    },
    {
        "id": "req-2",
        "patient_name": "Little Ayan (Age 6)",
        "blood_group": "O-",
        "units_needed": 1,
        "hospital_name": "Sylhet Women's Medical College Hospital",
        "city": "Sylhet",
        "urgency": "Critical",
        "deadline": "Within 3 hours",
        "reason": "Pediatric thalassemia patient experiencing severe sudden hemoglobin drop.",
        "status": "Pending",
        "contact_person": "Rehana Parvin (Mother)",
        "contact_phone": "+880 1819-876543",
        "responses_count": 0
    },
    {
        "id": "req-3",
        "patient_name": "Abdul Karim",
        "blood_group": "A+",
        "units_needed": 3,
        "hospital_name": "Parkview Medical College Hospital",
        "city": "Sylhet",
        "urgency": "Urgent",
        "deadline": "Today by 6:00 PM",
        "reason": "Planned open coronary artery bypass graft (CABG). Transfusion backup requested.",
        "status": "Pending",
        "contact_person": "Dr. Tarek Hossain",
        "contact_phone": "+880 1712-765432",
        "responses_count": 0
    },
    {
        "id": "req-4",
        "patient_name": "Rokeya Khatun",
        "blood_group": "AB+",
        "units_needed": 1,
        "hospital_name": "Jalalabad Ragib-Rabeya Medical College",
        "city": "Sylhet",
        "urgency": "Normal",
        "deadline": "Tomorrow morning",
        "reason": "Postpartum hemorrhage management following safe cesarean delivery.",
        "status": "Fulfilled",
        "contact_person": "Kabir Ahmed (Husband)",
        "contact_phone": "+880 1714-543210",
        "responses_count": 2
    }
]

INITIAL_CENTERS_DATA = [
    {
        "id": "center-1",
        "name": "Sylhet MAG Osmani Medical College Blood Bank",
        "category": "Tertiary Medical Center",
        "address": "Medical Road, Kazirbazar, Sylhet 3100",
        "city": "Sylhet",
        "location": "Kazirbazar, Sylhet",
        "phone": "+880 821-713667",
        "emergency_phone": "+880 821-713668",
        "email": "bloodbank@somch.gov.bd",
        "open_hours": "24/7 Transfusion Wing",
        "emergency_24x7": True,
        "distance_km": 1.1,
        "available_units": 68,
        "blood_groups_available": json.dumps(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
        "coordinates_lat": 24.8949,
        "coordinates_lng": 91.8687,
        "services": json.dumps(["Component Separation", "Apheresis", "Emergency Screening", "Cryoprecipitate"]),
        "rating": 4.9,
        "total_reviews": 312
    },
    {
        "id": "center-2",
        "name": "Sylhet Red Crescent Blood Transfusion Center",
        "category": "Humanitarian Center",
        "address": "Red Crescent Bhaban, Subidbazar, Sylhet",
        "city": "Sylhet",
        "location": "Subidbazar, Sylhet",
        "phone": "+880 821-716442",
        "emergency_phone": "+880 1711-223344",
        "email": "rcblood.sylhet@bdrcs.org",
        "open_hours": "24 Hours Continuous Dispatch",
        "emergency_24x7": True,
        "distance_km": 2.3,
        "available_units": 45,
        "blood_groups_available": json.dumps(["A+", "B+", "O+", "O-", "AB+"]),
        "coordinates_lat": 24.9035,
        "coordinates_lng": 91.8592,
        "services": json.dumps(["Voluntary Donation Drives", "Cross-matching", "NAT Tested Units"]),
        "rating": 4.8,
        "total_reviews": 218
    },
    {
        "id": "center-3",
        "name": "Al-Haramain Hospital Transfusion Unit",
        "category": "Specialized Hospital",
        "address": "Samitighor, Subhanighat, Sylhet",
        "city": "Sylhet",
        "location": "Subhanighat, Sylhet",
        "phone": "+880 821-728100",
        "emergency_phone": "+880 1962-424242",
        "email": "bloodsupport@alharamainhospital.com",
        "open_hours": "24/7 Critical Care Transfusion",
        "emergency_24x7": True,
        "distance_km": 3.4,
        "available_units": 38,
        "blood_groups_available": json.dumps(["A+", "B+", "B-", "O+", "AB+"]),
        "coordinates_lat": 24.8871,
        "coordinates_lng": 91.8795,
        "services": json.dumps(["ICU Transfusions", "Plateletpheresis", "Fresh Frozen Plasma"]),
        "rating": 4.7,
        "total_reviews": 164
    }
]

INITIAL_INVENTORY_DATA = [
    {"blood_group": "A+", "available_units": 24, "reserved_units": 6, "status": "Available"},
    {"blood_group": "A-", "available_units": 8, "reserved_units": 2, "status": "Critical"},
    {"blood_group": "B+", "available_units": 31, "reserved_units": 8, "status": "Available"},
    {"blood_group": "B-", "available_units": 6, "reserved_units": 1, "status": "Critical"},
    {"blood_group": "AB+", "available_units": 14, "reserved_units": 4, "status": "High Demand"},
    {"blood_group": "AB-", "available_units": 4, "reserved_units": 1, "status": "Critical"},
    {"blood_group": "O+", "available_units": 42, "reserved_units": 10, "status": "Available"},
    {"blood_group": "O-", "available_units": 5, "reserved_units": 3, "status": "Critical"},
]

INITIAL_DONATIONS_DATA = [
    {"id": "rec-1", "donor_name": "Rahim Ahmed", "blood_group": "B+", "center_name": "Sylhet MAG Osmani Medical College", "date": "2026-06-12", "units": 1, "status": "Completed"},
    {"id": "rec-2", "donor_name": "Fatima Begum", "blood_group": "O-", "center_name": "Sylhet Red Crescent Center", "date": "2026-05-20", "units": 1, "status": "Completed"},
    {"id": "rec-3", "donor_name": "Tanvir Hasan", "blood_group": "A+", "center_name": "Parkview Medical Hospital", "date": "2026-04-18", "units": 1, "status": "Completed"},
    {"id": "rec-4", "donor_name": "Nusrat Jahan", "blood_group": "O+", "center_name": "Sylhet General Hospital", "date": "2026-05-18", "units": 1, "status": "Completed"},
    {"id": "rec-5", "donor_name": "Kamrul Islam", "blood_group": "AB+", "center_name": "Al-Haramain Hospital", "date": "2026-03-30", "units": 1, "status": "Completed"},
]

def seed_inventory_skeleton(db: Session):
    """Production-safe: one empty inventory row per blood group, no people, no demo data."""
    if db.query(InventoryItem).count() > 0:
        return
    for bg in ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]:
        db.add(InventoryItem(blood_group=bg, available_units=0, reserved_units=0,
                             status="Critical", last_updated="Not yet updated"))
    db.commit()


def seed_database(db: Session):
    """Seed DEMO data (only in development, or when SEED_DEMO_DATA=true outside production)."""
    from backend.app.config import settings
    if not settings.SEED_DEMO_DATA:
        seed_inventory_skeleton(db)
        return
    # Check if users exist
    if db.query(User).count() > 0:
        return

    print("Seeding initial database entities...")

    # 1. Seed Users with securely hashed bcrypt passwords
    default_password_hash = get_password_hash("LiforaDemo2026!")
    for u in INITIAL_USERS:
        # Give standard accounts their custom password hash or default demo hash
        pwd = default_password_hash
        if u["email"] == "donor@lifora.org":
            pwd = get_password_hash("LiforaDonor2026!")
        elif u["email"] == "requester@lifora.org":
            pwd = get_password_hash("LiforaReq2026!")
        elif u["email"] == "admin@lifora.org":
            pwd = get_password_hash("LiforaAdmin2026!")

        user_obj = User(
            id=u["id"],
            email=u["email"],
            hashed_password=pwd,
            name=u["name"],
            role=u["role"],
            blood_group=u.get("blood_group"),
            city=u.get("city", "Sylhet"),
            location=u.get("location"),
            phone=u.get("phone"),
            total_donations=u.get("total_donations", 0),
            last_donation=u.get("last_donation"),
            availability=u.get("availability", "Available"),
            email_verified=True,
            profile_completed=True,
            age=30,
            radius_km=10
        )
        db.add(user_obj)
    db.commit()

    # 2. Seed Donors
    for d in INITIAL_DONORS_DATA:
        # Match user_id if email matches
        matched_user = db.query(User).filter(User.email == d["email"]).first()
        donor_obj = Donor(
            id=d["id"],
            user_id=matched_user.id if matched_user else None,
            name=d["name"],
            email=d["email"],
            blood_group=d["blood_group"],
            location=d["location"],
            city=d["city"],
            distance_km=d["distance_km"],
            availability=d["availability"],
            match_percentage=d["match_percentage"],
            last_donation_date=d["last_donation_date"],
            total_donations=d["total_donations"],
            phone=d["phone"],
            verified=d["verified"],
            bio=d["bio"]
        )
        db.add(donor_obj)
    db.commit()

    # 3. Seed Requests
    for r in INITIAL_REQUESTS_DATA:
        req_obj = BloodRequest(
            id=r["id"],
            user_id="user-req-1",
            patient_name=r["patient_name"],
            blood_group=r["blood_group"],
            units_needed=r["units_needed"],
            hospital_name=r["hospital_name"],
            city=r["city"],
            urgency=r["urgency"],
            deadline=r["deadline"],
            reason=r["reason"],
            status=r["status"],
            contact_person=r["contact_person"],
            contact_phone=r["contact_phone"],
            responses_count=r["responses_count"]
        )
        db.add(req_obj)
    db.commit()

    # 4. Seed Centers
    for c in INITIAL_CENTERS_DATA:
        center_obj = BloodCenter(
            id=c["id"],
            name=c["name"],
            category=c["category"],
            address=c["address"],
            city=c["city"],
            location=c["location"],
            phone=c["phone"],
            emergency_phone=c["emergency_phone"],
            email=c["email"],
            open_hours=c["open_hours"],
            emergency_24x7=c["emergency_24x7"],
            distance_km=c["distance_km"],
            available_units=c["available_units"],
            blood_groups_available=c["blood_groups_available"],
            coordinates_lat=c["coordinates_lat"],
            coordinates_lng=c["coordinates_lng"],
            services=c["services"],
            rating=c["rating"],
            total_reviews=c["total_reviews"]
        )
        db.add(center_obj)

    # 5. Seed Inventory
    for inv in INITIAL_INVENTORY_DATA:
        inv_obj = InventoryItem(
            blood_group=inv["blood_group"],
            available_units=inv["available_units"],
            reserved_units=inv["reserved_units"],
            status=inv["status"],
            last_updated="Just now"
        )
        db.add(inv_obj)

    # 6. Seed Donations
    for rec in INITIAL_DONATIONS_DATA:
        rec_obj = DonationRecord(
            id=rec["id"],
            donor_name=rec["donor_name"],
            blood_group=rec["blood_group"],
            center_name=rec["center_name"],
            date=rec["date"],
            units=rec["units"],
            status=rec["status"]
        )
        db.add(rec_obj)

    # 7. Seed Demo Response
    demo_resp = BloodRequestResponse(
        id="res-demo-1",
        request_id="req-1",
        donor_id="donor-1",
        requester_id="user-req-1",
        status="accepted",
        message="I am on standby in Zindabazar and can reach Osmani Hospital within 20 minutes."
    )
    db.add(demo_resp)

    # 8. Seed Demo Notifications
    notifs = [
        AppNotification(
            id="notif-demo-1",
            user_id="user-1",
            request_id="req-1",
            type="request_match",
            title="Emergency Match: B+ Needed (Critical)",
            message="Patient Salma Begum (ICU Bed 04) at Osmani Medical College Hospital urgently needs 2 units of B+ whole blood.",
            is_read=False
        ),
        AppNotification(
            id="notif-demo-2",
            user_id="user-req-1",
            request_id="req-1",
            response_id="res-demo-1",
            type="donor_responded",
            title="Rahim Ahmed (B+) Responded!",
            message="Verified donor Rahim Ahmed (B+) responded and is ready to donate for Salma Begum at Osmani Hospital.",
            is_read=False
        ),
        AppNotification(
            id="notif-demo-3",
            user_id="user-1",
            request_id="req-2",
            type="request_match",
            title="Emergency Alert: O- Transfusion Standby",
            message="Emergency pediatric trauma call at Sylhet Women's Medical College Hospital.",
            is_read=True
        )
    ]
    for n in notifs:
        db.add(n)

    db.commit()
    print("Database seeding completed successfully!")
