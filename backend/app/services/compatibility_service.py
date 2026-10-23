from typing import List, Set

# Established LIFORA Blood Compatibility Matrix
# Donor group -> List of recipient groups donor can donate to
DONOR_GIVES_TO = {
    'O-': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    'O+': ['A+', 'B+', 'AB+', 'O+'],
    'A-': ['A+', 'A-', 'AB+', 'AB-'],
    'A+': ['A+', 'AB+'],
    'B-': ['B+', 'B-', 'AB+', 'AB-'],
    'B+': ['B+', 'AB+'],
    'AB-': ['AB-', 'AB+'],
    'AB+': ['AB+']
}

# Recipient group -> List of donor groups recipient can receive from
RECIPIENT_RECEIVES_FROM = {
    'O-': ['O-'],
    'O+': ['O-', 'O+'],
    'A-': ['O-', 'A-'],
    'A+': ['O-', 'O+', 'A-', 'A+'],
    'B-': ['O-', 'B-'],
    'B+': ['O-', 'O+', 'B-', 'B+'],
    'AB-': ['O-', 'A-', 'B-', 'AB-'],
    'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
}

def is_blood_compatible(donor_group: str, recipient_group: str) -> bool:
    """Check if donor blood group can safely donate to recipient blood group."""
    if not donor_group or not recipient_group:
        return False
    d = donor_group.strip().upper()
    r = recipient_group.strip().upper()
    if d == r:
        return True
    allowed_recipients = DONOR_GIVES_TO.get(d, [d])
    return r in allowed_recipients

def get_compatible_recipients(donor_group: str) -> List[str]:
    """Get all recipient blood groups that a given donor blood group can donate to."""
    d = donor_group.strip().upper()
    return DONOR_GIVES_TO.get(d, [d])

def get_compatible_donors(recipient_group: str) -> List[str]:
    """Get all donor blood groups that a recipient can receive blood from."""
    r = recipient_group.strip().upper()
    return RECIPIENT_RECEIVES_FROM.get(r, [r])
