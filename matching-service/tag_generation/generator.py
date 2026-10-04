import json
import os


# ---------------------------------------------------------
# PATH CONFIGURATION
# ---------------------------------------------------------

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(
            os.path.abspath(__file__)
        )
    )
)

HIERARCHY_PATH = os.path.join(
    BASE_DIR,
    "data",
    "tag_hierarchy.json"
)

RELATIONSHIPS_PATH = os.path.join(
    BASE_DIR,
    "data",
    "tag_relationships.json"
)


# ---------------------------------------------------------
# DATA LOADING
# ---------------------------------------------------------

def load_json_file(file_path):
    """
    Load and return JSON data from a file.
    """
    with open(file_path, "r", encoding="utf-8") as file:
        return json.load(file)


def load_tag_hierarchy():
    """
    Load the KaziForce tag hierarchy.
    """
    return load_json_file(HIERARCHY_PATH)


def load_tag_relationships():
    """
    Load the KaziForce tag relationships.
    """
    return load_json_file(RELATIONSHIPS_PATH)


# ---------------------------------------------------------
# TEXT NORMALIZATION
# ---------------------------------------------------------

def normalize_text(value):
    """
    Normalize text so that matching is case-insensitive
    and unnecessary whitespace is removed.
    """
    if value is None:
        return ""

    return " ".join(str(value).strip().lower().split())


def normalize_skills(skills):
    """
    Convert skills into a normalized list.

    Accepts either:
        "React, JavaScript, HTML"

    or:
        ["React", "JavaScript", "HTML"]
    """

    if isinstance(skills, str):
        skills = skills.split(",")

    if not isinstance(skills, list):
        return []

    normalized = []

    for skill in skills:
        normalized_skill = normalize_text(skill)

        if normalized_skill:
            normalized.append(normalized_skill)

    return sorted(set(normalized))


# ---------------------------------------------------------
# HIERARCHY SEARCH
# ---------------------------------------------------------

def find_skill_metadata(skill, hierarchy):
    """
    Find every category and specialization associated
    with a skill.

    A skill may appear in more than one branch of the
    hierarchy, so this function returns a list rather
    than stopping at the first match.
    """

    normalized_skill = normalize_text(skill)

    matches = []

    categories = hierarchy.get("categories", {})

    for category_key, category in categories.items():

        category_name = normalize_text(
            category.get("name", category_key)
        )

        specializations = category.get(
            "specializations",
            {}
        )

        for specialization_key, specialization in specializations.items():

            specialization_name = normalize_text(
                specialization.get(
                    "name",
                    specialization_key
                )
            )

            # -------------------------------------------------
            # Normal specialization
            # -------------------------------------------------

            skills = specialization.get("skills", [])

            for hierarchy_skill in skills:

                if normalize_text(hierarchy_skill) == normalized_skill:

                    matches.append({
                        "category": category_name,
                        "specialization": specialization_name,
                        "skill": normalized_skill
                    })

            # -------------------------------------------------
            # Subspecializations
            # -------------------------------------------------

            subspecializations = specialization.get(
                "subspecializations",
                {}
            )

            for subspecialization_key, subspecialization in subspecializations.items():

                subspecialization_name = normalize_text(
                    subspecialization.get(
                        "name",
                        subspecialization_key
                    )
                )

                subspecialization_skills = subspecialization.get(
                    "skills",
                    []
                )

                for hierarchy_skill in subspecialization_skills:

                    if normalize_text(hierarchy_skill) == normalized_skill:

                        matches.append({
                            "category": category_name,
                            "specialization": subspecialization_name,
                            "parent_specialization": specialization_name,
                            "skill": normalized_skill
                        })

    return matches


# ---------------------------------------------------------
# TAG GENERATION
# ---------------------------------------------------------

def generate_tags(skills, location):
    """
    Generate structured KaziForce tags from worker or
    gig information.

    Output contains:

        category
        specialization
        skills
        location
    """

    hierarchy = load_tag_hierarchy()

    normalized_skills = normalize_skills(skills)

    normalized_location = normalize_text(location)

    categories = set()
    specializations = set()
    matched_skills = set()

    skill_metadata = {}

    # -----------------------------------------------------
    # Process skills
    # -----------------------------------------------------

    for skill in normalized_skills:

        matches = find_skill_metadata(
            skill,
            hierarchy
        )

        if matches:

            matched_skills.add(skill)

            skill_metadata[skill] = matches

            for metadata in matches:

                categories.add(
                    metadata["category"]
                )

                specializations.add(
                    metadata["specialization"]
                )

    # -----------------------------------------------------
    # Process location
    # -----------------------------------------------------

    locations = []

    if normalized_location:
        locations.append(normalized_location)

    # -----------------------------------------------------
    # Build final tag structure
    # -----------------------------------------------------

    return {
        "category": sorted(categories),
        "specialization": sorted(specializations),
        "skills": sorted(matched_skills),
        "location": locations
    }


# ---------------------------------------------------------
# RELATIONSHIP LOOKUP
# ---------------------------------------------------------

def get_tag_relationship(tag):
    """
    Retrieve relationship information for a tag.
    """

    relationships = load_tag_relationships().get(
        "relationships",
        {}
    )

    normalized_tag = normalize_text(tag)

    return relationships.get(
        normalized_tag,
        {
            "parent": None,
            "related": []
        }
    )


# ---------------------------------------------------------
# FULL TAG GENERATION
# ---------------------------------------------------------

def generate_full_tags(skills, location):
    """
    Generate tags together with relationship information.

    This provides the structured representation that
    later matching components can use for similarity
    and hierarchical matching.
    """

    tags = generate_tags(
        skills,
        location
    )

    relationship_data = {}

    for skill in tags["skills"]:

        relationship_data[skill] = get_tag_relationship(
            skill
        )

    return {
        "tags": tags,
        "relationships": relationship_data
    }


# ---------------------------------------------------------
# TEST EXECUTION
# ---------------------------------------------------------

if __name__ == "__main__":

    example_skills = [
        "React",
        "JavaScript",
        "HTML",
        "CSS"
    ]

    example_location = "Nairobi"

    result = generate_full_tags(
        example_skills,
        example_location
    )

    print("\nKaziForce Tag Generation Result")
    print("--------------------------------")

    print(
        json.dumps(
            result,
            indent=4
        )
    )