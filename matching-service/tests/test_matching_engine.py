import csv
import os
import sys


# ---------------------------------------------------------
# PYTHON PATH CONFIGURATION
# ---------------------------------------------------------

MATCHING_SERVICE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

PROJECT_ROOT = os.path.dirname(
    MATCHING_SERVICE_DIR
)

if MATCHING_SERVICE_DIR not in sys.path:
    sys.path.insert(
        0,
        MATCHING_SERVICE_DIR
    )


# ---------------------------------------------------------
# INTERNAL IMPORT
# ---------------------------------------------------------

from matching.engine import (
    load_workers,
    load_gigs,
    find_gig,
    match_workers_to_gig
)


# ---------------------------------------------------------
# PATH CONFIGURATION
# ---------------------------------------------------------

TEST_CASES_PATH = os.path.join(
    PROJECT_ROOT,
    "data",
    "test_cases.csv"
)


# ---------------------------------------------------------
# LOAD TEST CASES
# ---------------------------------------------------------

def load_test_cases():
    """
    Load the predefined KaziForce matching test cases.
    """

    with open(
        TEST_CASES_PATH,
        "r",
        encoding="utf-8",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        return list(reader)


# ---------------------------------------------------------
# RUN ONE TEST CASE
# ---------------------------------------------------------

def run_test_case(
    test_case,
    workers,
    gigs
):
    """
    Run one matching test case and compare the actual
    top worker against the expected worker.
    """

    test_id = test_case["test_id"]
    gig_id = test_case["gig_id"]
    expected_worker = test_case[
        "expected_top_worker"
    ]

    gig = find_gig(
        gig_id,
        gigs
    )

    if gig is None:

        return {
            "test_id": test_id,
            "gig_id": gig_id,
            "expected": expected_worker,
            "actual": "GIG NOT FOUND",
            "passed": False
        }

    recommendations = match_workers_to_gig(
        gig,
        workers,
        top_n=5
    )

    if not recommendations:

        return {
            "test_id": test_id,
            "gig_id": gig_id,
            "expected": expected_worker,
            "actual": "NO RECOMMENDATIONS",
            "passed": False
        }

    actual_worker = recommendations[0][
        "worker_id"
    ]

    actual_score = recommendations[0][
        "score"
    ]

    passed = (
        actual_worker == expected_worker
    )

    return {
        "test_id": test_id,
        "gig_id": gig_id,
        "expected": expected_worker,
        "actual": actual_worker,
        "score": actual_score,
        "passed": passed
    }


# ---------------------------------------------------------
# RUN ALL TEST CASES
# ---------------------------------------------------------

def run_all_tests():
    """
    Run all predefined KaziForce matching test cases.
    """

    workers = load_workers()

    gigs = load_gigs()

    test_cases = load_test_cases()

    results = []

    for test_case in test_cases:

        result = run_test_case(
            test_case,
            workers,
            gigs
        )

        results.append(
            result
        )

    return results


# ---------------------------------------------------------
# DISPLAY RESULTS
# ---------------------------------------------------------

def display_results(results):
    """
    Display a readable summary of all test results.
    """

    print(
        "\nKaziForce Matching Engine Validation"
    )

    print(
        "====================================="
    )

    passed_count = 0
    failed_count = 0

    for result in results:

        if result["passed"]:

            status = "PASS"
            passed_count += 1

        else:

            status = "FAIL"
            failed_count += 1

        score = result.get(
            "score",
            "-"
        )

        print(
            f"{status} | "
            f"{result['test_id']} | "
            f"{result['gig_id']} | "
            f"Expected: {result['expected']} | "
            f"Actual: {result['actual']} | "
            f"Score: {score}"
        )

    total = len(results)

    print(
        "\n-------------------------------------"
    )

    print(
        f"Total tests: {total}"
    )

    print(
        f"Passed:      {passed_count}"
    )

    print(
        f"Failed:      {failed_count}"
    )

    if total > 0:

        accuracy = (
            passed_count / total
        ) * 100

        print(
            f"Accuracy:    {accuracy:.2f}%"
        )

    print(
        "-------------------------------------"
    )

    return failed_count


# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------

if __name__ == "__main__":

    results = run_all_tests()

    failed_count = display_results(
        results
    )

    if failed_count > 0:

        raise SystemExit(1)