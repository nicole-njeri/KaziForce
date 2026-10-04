from typing import Iterable, Set


# ---------------------------------------------------------
# TAG NORMALIZATION
# ---------------------------------------------------------

def normalize_tags(tags: Iterable[str]) -> Set[str]:
    """
    Normalize a collection of tags.

    Normalization makes matching case-insensitive and
    removes duplicate or empty tags.
    """

    if tags is None:
        return set()

    normalized = set()

    for tag in tags:
        if tag is None:
            continue

        cleaned_tag = " ".join(
            str(tag).strip().lower().split()
        )

        if cleaned_tag:
            normalized.add(cleaned_tag)

    return normalized


# ---------------------------------------------------------
# BASIC TAG OVERLAP
# ---------------------------------------------------------

def calculate_tag_overlap(worker_tags, gig_tags):
    """
    Calculate the proportion of gig-required tags that
    are also present in the worker's tags.

    Formula:

        overlap =
        common_tags / gig_required_tags

    This measures how much of the gig's requirements
    the worker satisfies.
    """

    worker_set = normalize_tags(worker_tags)
    gig_set = normalize_tags(gig_tags)

    if not gig_set:
        return 0.0

    common_tags = worker_set.intersection(gig_set)

    return len(common_tags) / len(gig_set)


# ---------------------------------------------------------
# JACCARD SIMILARITY
# ---------------------------------------------------------

def calculate_jaccard_similarity(worker_tags, gig_tags):
    """
    Calculate Jaccard similarity between worker and gig tags.

    Formula:

        J(A, B) = |A ∩ B| / |A ∪ B|

    The result ranges from 0.0 to 1.0.
    """

    worker_set = normalize_tags(worker_tags)
    gig_set = normalize_tags(gig_tags)

    if not worker_set and not gig_set:
        return 1.0

    if not worker_set or not gig_set:
        return 0.0

    intersection = worker_set.intersection(gig_set)
    union = worker_set.union(gig_set)

    return len(intersection) / len(union)


# ---------------------------------------------------------
# COMMON TAGS
# ---------------------------------------------------------

def get_common_tags(worker_tags, gig_tags):
    """
    Return tags shared by the worker and the gig.
    """

    worker_set = normalize_tags(worker_tags)
    gig_set = normalize_tags(gig_tags)

    return sorted(
        worker_set.intersection(gig_set)
    )


# ---------------------------------------------------------
# MISSING TAGS
# ---------------------------------------------------------

def get_missing_tags(worker_tags, gig_tags):
    """
    Return gig-required tags that the worker does not have.
    """

    worker_set = normalize_tags(worker_tags)
    gig_set = normalize_tags(gig_tags)

    return sorted(
        gig_set.difference(worker_set)
    )


# ---------------------------------------------------------
# EXTRA WORKER TAGS
# ---------------------------------------------------------

def get_extra_worker_tags(worker_tags, gig_tags):
    """
    Return worker tags that are not directly required
    by the gig.
    """

    worker_set = normalize_tags(worker_tags)
    gig_set = normalize_tags(gig_tags)

    return sorted(
        worker_set.difference(gig_set)
    )


# ---------------------------------------------------------
# COMPLETE SIMILARITY ANALYSIS
# ---------------------------------------------------------

def calculate_similarity(worker_tags, gig_tags):
    """
    Perform a complete similarity analysis between a worker
    and a gig.

    Returns:

        overlap
        jaccard_similarity
        common_tags
        missing_tags
        extra_worker_tags
    """

    return {
        "overlap": round(
            calculate_tag_overlap(
                worker_tags,
                gig_tags
            ),
            4
        ),

        "jaccard_similarity": round(
            calculate_jaccard_similarity(
                worker_tags,
                gig_tags
            ),
            4
        ),

        "common_tags": get_common_tags(
            worker_tags,
            gig_tags
        ),

        "missing_tags": get_missing_tags(
            worker_tags,
            gig_tags
        ),

        "extra_worker_tags": get_extra_worker_tags(
            worker_tags,
            gig_tags
        )
    }


# ---------------------------------------------------------
# TEST EXECUTION
# ---------------------------------------------------------

if __name__ == "__main__":

    worker_tags = [
        "react",
        "javascript",
        "html",
        "css"
    ]

    gig_tags = [
        "react",
        "javascript",
        "html",
        "css"
    ]

    result = calculate_similarity(
        worker_tags,
        gig_tags
    )

    print("\nKaziForce Similarity Test")
    print("-------------------------")

    print(f"Worker tags: {worker_tags}")
    print(f"Gig tags:    {gig_tags}")

    print("\nSimilarity results:")

    for key, value in result.items():
        print(f"{key}: {value}")