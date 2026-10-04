from typing import Dict, List


# ---------------------------------------------------------
# MATCH STRENGTH
# ---------------------------------------------------------

def classify_match_strength(score: float) -> str:
    """
    Classify a match score into a human-readable
    match-strength category.

    Score ranges:

        80 - 100  -> Strong
        60 - 79.99 -> Moderate
        0 - 59.99  -> Weak
    """

    if score >= 80:
        return "Strong"

    if score >= 60:
        return "Moderate"

    return "Weak"


# ---------------------------------------------------------
# SORT MATCH RESULTS
# ---------------------------------------------------------

def sort_matches(matches: List[Dict]) -> List[Dict]:
    """
    Sort workers from the highest match score to the
    lowest match score.

    The function does not modify the original list.
    """

    return sorted(
        matches,
        key=lambda match: match.get(
            "score",
            0
        ),
        reverse=True
    )


# ---------------------------------------------------------
# ASSIGN RANKINGS
# ---------------------------------------------------------

def assign_rankings(matches: List[Dict]) -> List[Dict]:
    """
    Sort matches and assign a ranking position to each
    worker.

    Example:

        W001 -> rank 1
        W015 -> rank 2
        W009 -> rank 3
    """

    sorted_matches = sort_matches(
        matches
    )

    ranked_matches = []

    for position, match in enumerate(
        sorted_matches,
        start=1
    ):

        ranked_match = match.copy()

        ranked_match["rank"] = position

        ranked_match["match_strength"] = (
            classify_match_strength(
                ranked_match.get(
                    "score",
                    0
                )
            )
        )

        ranked_matches.append(
            ranked_match
        )

    return ranked_matches


# ---------------------------------------------------------
# TOP RECOMMENDATIONS
# ---------------------------------------------------------

def get_top_matches(
    matches: List[Dict],
    limit: int = 5
) -> List[Dict]:
    """
    Return the highest-ranked workers.

    The default is the top five workers.
    """

    if limit <= 0:
        return []

    ranked_matches = assign_rankings(
        matches
    )

    return ranked_matches[:limit]


# ---------------------------------------------------------
# MINIMUM SCORE FILTER
# ---------------------------------------------------------

def filter_by_minimum_score(
    matches: List[Dict],
    minimum_score: float = 0
) -> List[Dict]:
    """
    Remove matches below a specified minimum score.

    Example:

        minimum_score = 60

    Only workers with scores of 60 or above
    will be retained.
    """

    filtered_matches = [
        match
        for match in matches
        if match.get(
            "score",
            0
        ) >= minimum_score
    ]

    return filtered_matches


# ---------------------------------------------------------
# COMPLETE RANKING PIPELINE
# ---------------------------------------------------------

def rank_matches(
    matches: List[Dict],
    limit: int = None,
    minimum_score: float = 0
) -> List[Dict]:
    """
    Complete KaziForce ranking process.

    Steps:

        1. Filter low-scoring matches.
        2. Sort by match score.
        3. Assign ranking positions.
        4. Assign match-strength labels.
        5. Optionally return only the top N matches.
    """

    filtered_matches = filter_by_minimum_score(
        matches,
        minimum_score
    )

    ranked_matches = assign_rankings(
        filtered_matches
    )

    if limit is not None:
        ranked_matches = ranked_matches[
            :limit
        ]

    return ranked_matches


# ---------------------------------------------------------
# TEST EXECUTION
# ---------------------------------------------------------

if __name__ == "__main__":

    # Example results from the scoring component.
    example_matches = [
        {
            "worker_id": "W001",
            "score": 99.0
        },
        {
            "worker_id": "W015",
            "score": 91.5
        },
        {
            "worker_id": "W009",
            "score": 76.0
        },
        {
            "worker_id": "W010",
            "score": 64.5
        },
        {
            "worker_id": "W002",
            "score": 42.0
        }
    ]

    ranked_results = rank_matches(
        example_matches,
        limit=5,
        minimum_score=0
    )

    print("\nKaziForce Ranking Test")
    print("----------------------")

    for match in ranked_results:

        print(
            f"{match['rank']}. "
            f"{match['worker_id']} - "
            f"{match['score']}% - "
            f"{match['match_strength']}"
        )