from flask import Flask, jsonify, request
from flask_cors import CORS

from matching.engine import (
    load_workers,
    load_gigs,
    find_gig,
    match_workers_to_gig,
    match_worker_to_gigs
)


# ---------------------------------------------------------
# FLASK APPLICATION
# ---------------------------------------------------------

app = Flask(__name__)

CORS(app)


# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------

@app.route("/", methods=["GET"])
def home():
    """
    Confirm that the KaziForce matching service is running.
    """

    return jsonify({
        "message": "KaziForce matching service is running",
        "service": "tag-based matching engine",
        "status": "ok"
    })


# ---------------------------------------------------------
# SERVICE HEALTH CHECK
# ---------------------------------------------------------

@app.route("/health", methods=["GET"])
def health():
    """
    Health endpoint for service monitoring.
    """

    return jsonify({
        "status": "healthy"
    })


# ---------------------------------------------------------
# MATCH WORKERS TO A GIG
# ---------------------------------------------------------

@app.route("/api/match/workers", methods=["POST"])
def match_workers():
    """
    Return ranked worker recommendations for a gig.

    Expected request:

    {
        "gig_id": "G001",
        "top_n": 5
    }
    """

    data = request.get_json(
        silent=True
    )

    if not data:
        return jsonify({
            "error": "Request body must contain JSON data"
        }), 400

    gig_id = data.get(
        "gig_id"
    )

    top_n = data.get(
        "top_n",
        5
    )

    if not gig_id:

        return jsonify({
            "error": "gig_id is required"
        }), 400

    try:

        top_n = int(top_n)

    except (TypeError, ValueError):

        return jsonify({
            "error": "top_n must be an integer"
        }), 400

    if top_n <= 0:

        return jsonify({
            "error": "top_n must be greater than 0"
        }), 400

    # Database-backed callers provide the current gig and worker records.
    # The original CSV path remains unchanged for the predefined test cases.
    if data.get("gig") and isinstance(data.get("workers"), list):
        gig = data["gig"]
        workers = data["workers"]
    else:
        workers = load_workers()
        gigs = load_gigs()
        gig = find_gig(gig_id, gigs)

    if gig is None:

        return jsonify({
            "error": f"Gig '{gig_id}' was not found"
        }), 404

    # -----------------------------------------------------
    # Generate recommendations
    # -----------------------------------------------------

    recommendations = match_workers_to_gig(
        gig,
        workers,
        top_n=top_n
    )

    # -----------------------------------------------------
    # Return response
    # -----------------------------------------------------

    return jsonify({
        "gig": {
            "gig_id": gig.get(
                "gig_id"
            ),
            "title": gig.get(
                "title"
            ),
            "category": gig.get(
                "category"
            ),
            "specialization": gig.get(
                "specialization"
            ),
            "location": gig.get(
                "location"
            )
        },
        "recommendations": recommendations
    })


# ---------------------------------------------------------
# MATCH ONE WORKER TO GIGS
# ---------------------------------------------------------

@app.route("/api/match/gigs", methods=["POST"])
def match_gigs():
    """
    Return ranked gig recommendations for a worker.

    Expected request:

    {
        "worker_id": "W001",
        "top_n": 5
    }
    """

    data = request.get_json(
        silent=True
    )

    if not data:
        return jsonify({
            "error": "Request body must contain JSON data"
        }), 400

    worker_id = data.get(
        "worker_id"
    )

    top_n = data.get(
        "top_n",
        5
    )

    if not worker_id:

        return jsonify({
            "error": "worker_id is required"
        }), 400

    try:

        top_n = int(top_n)

    except (TypeError, ValueError):

        return jsonify({
            "error": "top_n must be an integer"
        }), 400

    if top_n <= 0:

        return jsonify({
            "error": "top_n must be greater than 0"
        }), 400

    # -----------------------------------------------------
    # Load data
    # -----------------------------------------------------

    if data.get("worker") and isinstance(data.get("gigs"), list):
        worker = data["worker"]
        gigs = data["gigs"]
    else:
        workers = load_workers()
        gigs = load_gigs()
        worker = next((current for current in workers if str(current.get("worker_id")) == str(worker_id)), None)

    if worker is None:

        return jsonify({
            "error": f"Worker '{worker_id}' was not found"
        }), 404

    # -----------------------------------------------------
    # Generate recommendations
    # -----------------------------------------------------

    recommendations = match_worker_to_gigs(
        worker,
        gigs,
        top_n=top_n
    )

    # -----------------------------------------------------
    # Return response
    # -----------------------------------------------------

    return jsonify({
        "worker": {
            "worker_id": worker.get(
                "worker_id"
            ),
            "location": worker.get(
                "location"
            ),
            "experience_years": worker.get(
                "experience_years"
            ),
            "reputation": worker.get(
                "reputation"
            )
        },
        "recommendations": recommendations
    })


# ---------------------------------------------------------
# GET ALL AVAILABLE GIGS
# ---------------------------------------------------------

@app.route("/api/gigs", methods=["GET"])
def get_gigs():
    """
    Return all available gigs from the matching dataset.
    """

    gigs = load_gigs()

    return jsonify({
        "count": len(gigs),
        "gigs": gigs
    })


# ---------------------------------------------------------
# GET ALL WORKERS
# ---------------------------------------------------------

@app.route("/api/workers", methods=["GET"])
def get_workers():
    """
    Return all workers from the matching dataset.
    """

    workers = load_workers()

    return jsonify({
        "count": len(workers),
        "workers": workers
    })


# ---------------------------------------------------------
# ERROR HANDLERS
# ---------------------------------------------------------

@app.errorhandler(404)
def not_found(error):
    """
    Handle unknown routes.
    """

    return jsonify({
        "error": "Endpoint not found"
    }), 404


@app.errorhandler(500)
def internal_server_error(error):
    """
    Handle unexpected server errors.
    """

    return jsonify({
        "error": "Internal matching service error"
    }), 500


# ---------------------------------------------------------
# START SERVER
# ---------------------------------------------------------

if __name__ == "__main__":

    app.run(
        host="127.0.0.1",
        port=5001,
        debug=True
    )
