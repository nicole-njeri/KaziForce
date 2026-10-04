from typing import Dict, List


# ---------------------------------------------------------
# DEFAULT MATCHING WEIGHTS
# ---------------------------------------------------------
#
# The weights determine how much each factor contributes
# to the overall worker-gig matching score.
#
# The total is 1.00 (100%).
#
# Tag similarity is given the highest weight because the
# KaziForce model is primarily based on matching skills
# and requirements through tags.
#
# The remaining factors provide additional context.
# ---------------------------------------------------------

DEFAULT_WEIGHTS = {
    "tag_similarity": 0.50,
    "hierarchical_match": 0.15,
    "location_match": 0.15,
    "experience_match": 0.10,
    "reputation": 0.10
}


# ---------------------------------------------------------
# WEIGHT VALIDATION
# ---------------------------------------------------------

def validate_weights(weights: Dict[str, float]) -> None:
    """
    Validate that all required scoring factors exist and
    that their weights add up to 1.0.
    """

    required_factors = set(DEFAULT_WEIGHTS.keys())

    provided_factors = set(weights.keys())

    missing_factors = required_factors - provided_factors

    if missing_factors:
        raise ValueError(
            f"Missing scoring factors: {sorted(missing_factors)}"
        )

    total = sum(weights.values())

    if abs(total - 1.0) > 0.0001:
        raise ValueError(
            f"Scoring weights must add up to 1.0. "
            f"Current total: {total}"
        )


# ---------------------------------------------------------
# TAG SIMILARITY SCORE
# ---------------------------------------------------------

def calculate_tag_similarity_score(
    overlap: float,
    jaccard_similarity: float
) -> float:
    """
    Combine tag overlap and Jaccard similarity into one
    tag similarity score.

    The gig requirement coverage is given slightly more
    importance because the system needs to determine how
    much of the client's required skill set the worker
    satisfies.

    Formula:

        Tag Similarity =
        (0.60 × overlap) +
        (0.40 × Jaccard similarity)
    """

    score = (
        (0.60 * overlap) +
        (0.40 * jaccard_similarity)
    )

    return round(
        max(0.0, min(1.0, score)),
        4
    )


# ---------------------------------------------------------
# HIERARCHICAL MATCH SCORE
# ---------------------------------------------------------

def calculate_hierarchical_match_score(
    matched_hierarchy_tags: List[str],
    total_required_hierarchy_tags: int
) -> float:
    """
    Calculate how many required hierarchical tags are
    represented by the worker.

    A hierarchical tag may represent a broader relationship
    such as:

        React
          ↓
        Frontend Development
          ↓
        Web Development
          ↓
        Technology
    """

    if total_required_hierarchy_tags <= 0:
        return 0.0

    matched_count = len(
        set(matched_hierarchy_tags)
    )

    score = matched_count / total_required_hierarchy_tags

    return round(
        max(0.0, min(1.0, score)),
        4
    )


# ---------------------------------------------------------
# LOCATION MATCH SCORE
# ---------------------------------------------------------

def calculate_location_score(
    worker_location: str,
    gig_location: str
) -> float:
    """
    Calculate location compatibility.

    Exact location matches receive a score of 1.0.

    Different locations receive 0.0.

    Location is treated as a matching factor rather than
    a requirement that automatically eliminates a worker.
    """

    if not worker_location or not gig_location:
        return 0.0

    worker_location = str(
        worker_location
    ).strip().lower()

    gig_location = str(
        gig_location
    ).strip().lower()

    if worker_location == gig_location:
        return 1.0

    return 0.0


# ---------------------------------------------------------
# EXPERIENCE MATCH SCORE
# ---------------------------------------------------------

def calculate_experience_score(
    worker_experience: float,
    required_experience: float = 0
) -> float:
    """
    Calculate an experience compatibility score.

    If the gig does not specify a minimum experience
    requirement, the worker receives a neutral score of 1.0.

    If a requirement exists, the score represents how much
    of that requirement the worker satisfies.

    Example:

        Required = 4 years
        Worker   = 2 years

        Score = 2 / 4 = 0.5
    """

    if required_experience <= 0:
        return 1.0

    if worker_experience is None:
        worker_experience = 0

    try:
        worker_experience = float(
            worker_experience
        )

        required_experience = float(
            required_experience
        )

    except (TypeError, ValueError):
        return 0.0

    score = worker_experience / required_experience

    return round(
        max(0.0, min(1.0, score)),
        4
    )


# ---------------------------------------------------------
# REPUTATION SCORE
# ---------------------------------------------------------

def calculate_reputation_score(
    reputation: float,
    maximum_rating: float = 5.0
) -> float:
    """
    Normalize a worker's reputation rating to a value
    between 0.0 and 1.0.

    Example:

        Reputation = 4.5
        Maximum    = 5.0

        Score = 4.5 / 5.0 = 0.90
    """

    if reputation is None:
        return 0.0

    try:
        reputation = float(reputation)
        maximum_rating = float(maximum_rating)

    except (TypeError, ValueError):
        return 0.0

    if maximum_rating <= 0:
        return 0.0

    score = reputation / maximum_rating

    return round(
        max(0.0, min(1.0, score)),
        4
    )


# ---------------------------------------------------------
# OVERALL MATCH SCORE
# ---------------------------------------------------------

def calculate_match_score(
    tag_similarity: float,
    hierarchical_match: float,
    location_match: float,
    experience_match: float,
    reputation: float,
    weights: Dict[str, float] = None
) -> Dict:
    """
    Calculate the overall KaziForce worker-gig match score.

    Formula:

        Match Score =
            Tag Similarity × weight
          + Hierarchical Match × weight
          + Location Match × weight
          + Experience Match × weight
          + Reputation × weight

    The final score is normalized to a percentage.
    """

    if weights is None:
        weights = DEFAULT_WEIGHTS.copy()

    validate_weights(weights)

    weighted_components = {
        "tag_similarity": (
            tag_similarity *
            weights["tag_similarity"]
        ),

        "hierarchical_match": (
            hierarchical_match *
            weights["hierarchical_match"]
        ),

        "location_match": (
            location_match *
            weights["location_match"]
        ),

        "experience_match": (
            experience_match *
            weights["experience_match"]
        ),

        "reputation": (
            reputation *
            weights["reputation"]
        )
    }

    raw_score = sum(
        weighted_components.values()
    )

    final_score = max(
        0.0,
        min(1.0, raw_score)
    )

    return {
        "score": round(
            final_score * 100,
            2
        ),

        "normalized_score": round(
            final_score,
            4
        ),

        "components": {
            key: round(
                value,
                4
            )
            for key, value
            in weighted_components.items()
        },

        "weights": weights
    }


# ---------------------------------------------------------
# COMPLETE SCORING PIPELINE
# ---------------------------------------------------------

def score_worker_for_gig(
    similarity_result: Dict,
    worker_location: str,
    gig_location: str,
    worker_experience: float,
    required_experience: float = 0,
    reputation: float = 0.0,
    matched_hierarchy_tags: List[str] = None,
    total_required_hierarchy_tags: int = 0,
    weights: Dict[str, float] = None
) -> Dict:
    """
    Calculate a complete worker-gig score from similarity
    results and worker/gig attributes.
    """

    if matched_hierarchy_tags is None:
        matched_hierarchy_tags = []

    # -----------------------------------------------------
    # Calculate individual components
    # -----------------------------------------------------

    tag_similarity = calculate_tag_similarity_score(
        similarity_result.get(
            "overlap",
            0.0
        ),
        similarity_result.get(
            "jaccard_similarity",
            0.0
        )
    )

    hierarchical_match = (
        calculate_hierarchical_match_score(
            matched_hierarchy_tags,
            total_required_hierarchy_tags
        )
    )

    location_match = calculate_location_score(
        worker_location,
        gig_location
    )

    experience_match = calculate_experience_score(
        worker_experience,
        required_experience
    )

    reputation_score = calculate_reputation_score(
        reputation
    )

    # -----------------------------------------------------
    # Calculate overall score
    # -----------------------------------------------------

    result = calculate_match_score(
        tag_similarity=tag_similarity,
        hierarchical_match=hierarchical_match,
        location_match=location_match,
        experience_match=experience_match,
        reputation=reputation_score,
        weights=weights
    )

    # -----------------------------------------------------
    # Include individual component scores
    # -----------------------------------------------------

    result["individual_scores"] = {
        "tag_similarity": tag_similarity,
        "hierarchical_match": hierarchical_match,
        "location_match": location_match,
        "experience_match": experience_match,
        "reputation": reputation_score
    }

    return result


# ---------------------------------------------------------
# TEST EXECUTION
# ---------------------------------------------------------

if __name__ == "__main__":

    # Example similarity result from similarity.py
    similarity_result = {
        "overlap": 1.0,
        "jaccard_similarity": 1.0,
        "common_tags": [
            "css",
            "html",
            "javascript",
            "react"
        ],
        "missing_tags": [],
        "extra_worker_tags": []
    }

    result = score_worker_for_gig(
        similarity_result=similarity_result,
        worker_location="Nairobi",
        gig_location="Nairobi",
        worker_experience=2,
        required_experience=0,
        reputation=4.5,
        matched_hierarchy_tags=[
            "frontend development"
        ],
        total_required_hierarchy_tags=1
    )

    print("\nKaziForce Match Scoring Test")
    print("----------------------------")

    print(
        f"Overall match score: "
        f"{result['score']}%"
    )

    print("\nIndividual scores:")

    for key, value in result[
        "individual_scores"
    ].items():

        print(
            f"{key}: {value}"
        )

    print("\nWeighted components:")

    for key, value in result[
        "components"
    ].items():

        print(
            f"{key}: {value}"
        )