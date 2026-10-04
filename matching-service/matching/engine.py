import csv
import os
import sys
from typing import Dict, List


# ---------------------------------------------------------
# PYTHON PATH CONFIGURATION
# ---------------------------------------------------------

MATCHING_SERVICE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

if MATCHING_SERVICE_DIR not in sys.path:
    sys.path.insert(
        0,
        MATCHING_SERVICE_DIR
    )


# ---------------------------------------------------------
# INTERNAL IMPORTS
# ---------------------------------------------------------

from tag_generation.generator import generate_tags
from matching.similarity import calculate_similarity
from matching.scoring import score_worker_for_gig as calculate_worker_score
from matching.ranking import rank_matches


# ---------------------------------------------------------
# PATH CONFIGURATION
# ---------------------------------------------------------

BASE_DIR = os.path.dirname(
    MATCHING_SERVICE_DIR
)

WORKERS_PATH = os.path.join(
    BASE_DIR,
    "data",
    "workers.csv"
)

GIGS_PATH = os.path.join(
    BASE_DIR,
    "data",
    "gigs.csv"
)


# ---------------------------------------------------------
# CSV LOADING
# ---------------------------------------------------------

def load_csv(file_path: str) -> List[Dict]:
    """
    Load records from a CSV file and return them as
    dictionaries.
    """

    with open(
        file_path,
        "r",
        encoding="utf-8",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        return list(reader)


def load_workers() -> List[Dict]:
    """
    Load all worker records from workers.csv.
    """

    return load_csv(
        WORKERS_PATH
    )


def load_gigs() -> List[Dict]:
    """
    Load all gig records from gigs.csv.
    """

    return load_csv(
        GIGS_PATH
    )


# ---------------------------------------------------------
# DATA CONVERSION
# ---------------------------------------------------------

def convert_worker_data(worker: Dict) -> Dict:
    """
    Convert CSV worker values into appropriate Python
    data types.
    """

    worker_data = worker.copy()

    try:
        worker_data["experience_years"] = float(
            worker_data.get(
                "experience_years",
                0
            )
        )
    except (TypeError, ValueError):
        worker_data["experience_years"] = 0.0

    try:
        worker_data["reputation"] = float(
            worker_data.get(
                "reputation",
                0
            )
        )
    except (TypeError, ValueError):
        worker_data["reputation"] = 0.0

    return worker_data


def convert_gig_data(gig: Dict) -> Dict:
    """
    Convert CSV gig values into appropriate Python
    data types.
    """

    gig_data = gig.copy()

    try:
        gig_data["budget"] = float(
            gig_data.get(
                "budget",
                0
            )
        )
    except (TypeError, ValueError):
        gig_data["budget"] = 0.0

    return gig_data


# ---------------------------------------------------------
# TAG GENERATION
# ---------------------------------------------------------

def generate_worker_tags(worker: Dict) -> Dict:
    """
    Generate structured tags for a worker.
    """

    return generate_tags(
        worker.get(
            "skills",
            ""
        ),
        worker.get(
            "location",
            ""
        )
    )


def generate_gig_tags(gig: Dict) -> Dict:
    """
    Generate structured tags for a gig.
    """

    return generate_tags(
        gig.get(
            "required_skills",
            ""
        ),
        gig.get(
            "location",
            ""
        )
    )


# ---------------------------------------------------------
# HIERARCHICAL MATCHING
# ---------------------------------------------------------

def calculate_hierarchical_match(
    worker_tags: Dict,
    gig_tags: Dict
) -> Dict:
    """
    Calculate hierarchical compatibility between worker
    and gig tags.

    Category and specialization matches are considered
    hierarchical matches.
    """

    worker_categories = set(
        worker_tags.get(
            "category",
            []
        )
    )

    gig_categories = set(
        gig_tags.get(
            "category",
            []
        )
    )

    worker_specializations = set(
        worker_tags.get(
            "specialization",
            []
        )
    )

    gig_specializations = set(
        gig_tags.get(
            "specialization",
            []
        )
    )

    common_categories = (
        worker_categories.intersection(
            gig_categories
        )
    )

    common_specializations = (
        worker_specializations.intersection(
            gig_specializations
        )
    )

    matched_hierarchy_tags = sorted(
        common_categories.union(
            common_specializations
        )
    )

    required_hierarchy_tags = sorted(
        gig_categories.union(
            gig_specializations
        )
    )

    total_required_hierarchy_tags = len(
        required_hierarchy_tags
    )

    if total_required_hierarchy_tags == 0:

        score = 0.0

    else:

        score = (
            len(matched_hierarchy_tags)
            /
            total_required_hierarchy_tags
        )

    return {
        "score": round(
            min(1.0, score),
            4
        ),
        "matched_tags": matched_hierarchy_tags,
        "required_tags": required_hierarchy_tags
    }


# ---------------------------------------------------------
# SCORE ONE WORKER AGAINST ONE GIG
# ---------------------------------------------------------

def score_single_worker_for_gig(
    worker: Dict,
    gig: Dict
) -> Dict:
    """
    Generate a complete match result for one worker
    against one gig.
    """

    worker = convert_worker_data(
        worker
    )

    gig = convert_gig_data(
        gig
    )

    # -----------------------------------------------------
    # Generate tags
    # -----------------------------------------------------

    worker_tags = generate_worker_tags(
        worker
    )

    gig_tags = generate_gig_tags(
        gig
    )

    # -----------------------------------------------------
    # Calculate tag similarity
    # -----------------------------------------------------

    similarity = calculate_similarity(
        worker_tags.get(
            "skills",
            []
        ),
        gig_tags.get(
            "skills",
            []
        )
    )

    # -----------------------------------------------------
    # Calculate hierarchical match
    # -----------------------------------------------------

    hierarchy = calculate_hierarchical_match(
        worker_tags,
        gig_tags
    )

    # -----------------------------------------------------
    # Calculate final score
    # -----------------------------------------------------

    scoring_result = calculate_worker_score(
        similarity_result=similarity,
        worker_location=worker.get(
            "location",
            ""
        ),
        gig_location=gig.get(
            "location",
            ""
        ),
        worker_experience=worker.get(
            "experience_years",
            0
        ),
        required_experience=0,
        reputation=worker.get(
            "reputation",
            0
        ),
        matched_hierarchy_tags=hierarchy[
            "matched_tags"
        ],
        total_required_hierarchy_tags=len(
            hierarchy["required_tags"]
        )
    )

    return {
        "worker_id": worker.get(
            "worker_id"
        ),
        "gig_id": gig.get(
            "gig_id"
        ),
        "worker_location": worker.get(
            "location"
        ),
        "gig_location": gig.get(
            "location"
        ),
        "worker_experience": worker.get(
            "experience_years"
        ),
        "reputation": worker.get(
            "reputation"
        ),
        "worker_tags": worker_tags,
        "gig_tags": gig_tags,
        "similarity": similarity,
        "hierarchical_match": hierarchy,
        "score": scoring_result[
            "score"
        ],
        "normalized_score": scoring_result[
            "normalized_score"
        ],
        "individual_scores": scoring_result[
            "individual_scores"
        ]
    }


# ---------------------------------------------------------
# MATCH ALL WORKERS TO ONE GIG
# ---------------------------------------------------------

def match_workers_to_gig(
    gig: Dict,
    workers: List[Dict],
    top_n: int = 5
) -> List[Dict]:
    """
    Score every worker against one gig and return the
    highest-ranked workers.
    """

    matches = []

    for worker in workers:

        result = score_single_worker_for_gig(
            worker,
            gig
        )

        matches.append(
            result
        )

    return rank_matches(
        matches,
        limit=top_n,
        minimum_score=0
    )


# ---------------------------------------------------------
# FIND GIG BY ID
# ---------------------------------------------------------

def find_gig(
    gig_id: str,
    gigs: List[Dict]
):
    """
    Find a gig using its gig ID.
    """

    for gig in gigs:

        if gig.get(
            "gig_id"
        ) == gig_id:

            return gig

    return None


# ---------------------------------------------------------
# MATCH ONE WORKER TO ALL GIGS
# ---------------------------------------------------------

def match_worker_to_gigs(
    worker: Dict,
    gigs: List[Dict],
    top_n: int = 5
) -> List[Dict]:
    """
    Score one worker against every gig and return the
    highest-ranked gig recommendations.
    """

    matches = []

    for gig in gigs:

        result = score_single_worker_for_gig(
            worker,
            gig
        )

        matches.append(
            result
        )

    return rank_matches(
        matches,
        limit=top_n,
        minimum_score=0
    )


# ---------------------------------------------------------
# MAIN TEST
# ---------------------------------------------------------

if __name__ == "__main__":

    print("\nKaziForce Matching Engine")
    print("=========================")

    # -----------------------------------------------------
    # Load dataset
    # -----------------------------------------------------

    workers = [
        convert_worker_data(worker)
        for worker in load_workers()
    ]

    gigs = [
        convert_gig_data(gig)
        for gig in load_gigs()
    ]

    print(
        f"\nWorkers loaded: {len(workers)}"
    )

    print(
        f"Gigs loaded: {len(gigs)}"
    )

    # -----------------------------------------------------
    # Select G001 for testing
    # -----------------------------------------------------

    gig = find_gig(
        "G001",
        gigs
    )

    if gig is None:

        print(
            "\nError: G001 was not found."
        )

        raise SystemExit(1)

    print(
        "\nTesting gig:"
    )

    print(
        f"{gig['gig_id']} - "
        f"{gig['title']}"
    )

    print(
        f"Required skills: "
        f"{gig['required_skills']}"
    )

    # -----------------------------------------------------
    # Match workers
    # -----------------------------------------------------

    recommendations = match_workers_to_gig(
        gig,
        workers,
        top_n=5
    )

    # -----------------------------------------------------
    # Display recommendations
    # -----------------------------------------------------

    print(
        "\nTop worker recommendations:"
    )

    print(
        "----------------------------"
    )

    for recommendation in recommendations:

        print(
            f"{recommendation['rank']}. "
            f"{recommendation['worker_id']} - "
            f"{recommendation['score']}% - "
            f"{recommendation['match_strength']}"
        )

        print(
            f"   Common skills: "
            f"{', '.join(recommendation['similarity']['common_tags'])}"
        )

        print(
            f"   Missing skills: "
            f"{', '.join(recommendation['similarity']['missing_tags']) or 'None'}"
        )

        print(
            f"   Location: "
            f"{recommendation['worker_location']}"
        )

        print()