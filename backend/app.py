from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
import firebase_admin
from firebase_admin import credentials, db
import requests
import os
import json
import time
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# ==========================
# ENV LOAD
# ==========================
load_dotenv()

app = Flask(__name__)
CORS(app)

# ==========================
# GEMINI SAFE INIT
# ==========================
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

model = None

try:

    if GEMINI_API_KEY:

        genai.configure(api_key=GEMINI_API_KEY)

        model = genai.GenerativeModel("gemini-2.0-flash")

        print("Gemini Connected")

    else:

        print("Gemini API missing")

except Exception as e:

    print("Gemini Init Error:", e)

# ==========================
# FIREBASE SAFE INIT
# ==========================
try:

    if not firebase_admin._apps:

        cred = credentials.Certificate("serviceAccountKey.json")

        firebase_admin.initialize_app(cred, {
            "databaseURL": os.getenv("FIREBASE_DB_URL")
        })

        print("Firebase Connected")

except Exception as e:

    print("Firebase Init Error:", e)

# ==========================
# HEALTH ROUTE
# ==========================
@app.route("/")
def health():

    return jsonify({
        "status": "Backend Running",
        "firebase": os.getenv("FIREBASE_DB_URL")
    })

# ==========================
# GEMINI EXTRACTION
# ==========================
def extract_with_gemini(raw_text):

    if model is None:

        return {
            "location_name": "Bangalore",
            "crisis_type": "other",
            "severity": "medium",
            "affected_count": None,
            "needs": [],
            "summary": raw_text,
            "confidence": 60
        }

    prompt = f"""
You are an AI crisis extraction engine.

Extract JSON only.

Return ONLY valid JSON.

Format:

{{
  "location_name": "",
  "crisis_type": "",
  "severity": "",
  "affected_count": null,
  "needs": [],
  "summary": "",
  "confidence": 90
}}

Allowed crisis_type:
fire
flood
medical
structural
traffic
other

Allowed severity:
critical
high
medium
low

Text:
{raw_text}
"""

    try:

        response = model.generate_content(prompt)

        text = response.text.strip()

        if "```json" in text:
            text = text.replace("```json", "").replace("```", "")

        parsed = json.loads(text)

        return parsed

    except Exception as e:

        print("Gemini Parse Error:", e)

        return {
            "location_name": "Bangalore",
            "crisis_type": "other",
            "severity": "medium",
            "affected_count": None,
            "needs": [],
            "summary": raw_text,
            "confidence": 60
        }

# ==========================
# LOCATION → LAT LNG
# ==========================
def get_coordinates(location_name):

    try:

        url = "https://nominatim.openstreetmap.org/search"

        params = {
            "q": f"{location_name}, Bangalore, India",
            "format": "json",
            "limit": 1
        }

        headers = {
            "User-Agent": "CrisisMap"
        }

        response = requests.get(url, params=params, headers=headers)

        results = response.json()

        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])

    except Exception as e:
        print("Geocode Error:", e)

    return 12.9716, 77.5946

# ==========================
# PRIORITY ENGINE
# ==========================
def assign_priority(severity, affected_count):

    if severity == "critical":
        return "P1"

    if severity == "high":

        if affected_count and affected_count > 10:
            return "P1"

        return "P2"

    if severity == "medium":
        return "P2"

    return "P3"

# ==========================
# DUPLICATE DETECTION
# ==========================
def merge_duplicates(location_name):

    try:

        ref = db.reference("incidents")

        data = ref.get()

        if not data:
            return

        matches = []

        for key, value in data.items():

            if value.get("location_name", "").lower() == location_name.lower():
                matches.append((key, value))

        if len(matches) >= 3:

            for key, value in matches:

                db.reference(f"incidents/{key}").update({
                    "priority": "P1",
                    "report_count": value.get("report_count", 1) + 1
                })

    except Exception as e:

        print("Duplicate Merge Error:", e)

# ==========================
# EMAIL CODE
# ==========================
@app.route("/send-code", methods=["POST"])
def send_code():

    data = request.json or {}

    email = data.get("email")

    if not email:

        return jsonify({
            "error": "No email"
        }), 400

    code = str(random.randint(1000, 9999))

    try:

        sender_email = os.getenv("MAIL_EMAIL")
        sender_password = os.getenv("MAIL_PASSWORD")

        msg = MIMEMultipart()

        msg["From"] = sender_email
        msg["To"] = email
        msg["Subject"] = "CrisisMap Verification Code"

        body = f"""
Your CrisisMap verification code is:

{code}

Do not share this code.
"""

        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()

        server.login(sender_email, sender_password)

        server.send_message(msg)

        server.quit()

        print("Email Sent:", email)

        return jsonify({
            "success": True,
            "code": code
        })

    except Exception as e:

        print("Mail Error:", e)

        return jsonify({
            "success": False,
            "error": "Email failed"
        }), 500

# ==========================
# REPORT SUBMISSION
# ==========================
@app.route("/submit", methods=["POST"])
def submit_report():

    try:

        data = request.json or {}

        raw_text = data.get("text", "")

        if not raw_text:
            raw_text = "SOS Emergency detected."

        try:

            extracted = extract_with_gemini(raw_text)

        except Exception:

            extracted = {
                "location_name": "Bangalore",
                "crisis_type": "other",
                "severity": "medium",
                "affected_count": None,
                "needs": [],
                "summary": raw_text,
                "confidence": 60
            }

        location_name = extracted.get("location_name", "Unknown Area")

        lat, lng = get_coordinates(location_name)

        priority = assign_priority(
            extracted.get("severity"),
            extracted.get("affected_count")
        )

        incident = {
            "raw_text": raw_text,
            "location_name": location_name,
            "lat": lat,
            "lng": lng,
            "crisis_type": extracted.get("crisis_type", "other"),
            "priority": priority,
            "needs": extracted.get("needs", []),
            "summary": extracted.get("summary"),
            "severity": extracted.get("severity"),
            "status": "active",
            "approved": False,
            "report_count": 1,
            "ai_confidence": extracted.get("confidence", 90),
            "timestamp": int(time.time() * 1000)
        }

        ref = db.reference("incidents")

        ref.push(incident)

        merge_duplicates(location_name)

        return jsonify({
            "success": True,
            "incident": incident
        })

    except Exception as e:

        print("Submit Error:", e)

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# ==========================
# INCIDENTS
# ==========================
@app.route("/incidents", methods=["GET"])
def get_incidents():

    try:

        ref = db.reference("incidents")

        data = ref.get()

        incidents = []

        if data:

            for key, value in data.items():

                value["id"] = key
                incidents.append(value)

        incidents.sort(
            key=lambda x: x.get("timestamp", 0),
            reverse=True
        )

        return jsonify(incidents)

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500

# ==========================
# APPROVE
# ==========================
@app.route("/approve/<incident_id>", methods=["POST"])
def approve_incident(incident_id):

    db.reference(f"incidents/{incident_id}").update({
        "approved": True
    })

    return jsonify({"success": True})

# ==========================
# STATUS
# ==========================
@app.route("/update-status/<incident_id>", methods=["POST"])
def update_status(incident_id):

    data = request.json

    db.reference(f"incidents/{incident_id}").update({
        "status": data["status"]
    })

    return jsonify({"success": True})

# ==========================
# PRIORITY
# ==========================
@app.route("/update-priority/<incident_id>", methods=["POST"])
def update_priority(incident_id):

    data = request.json

    db.reference(f"incidents/{incident_id}").update({
        "priority": data["priority"]
    })

    return jsonify({"success": True})

# ==========================
# BRIEFING SAFE FINAL
# ==========================
@app.route("/briefing", methods=["GET"])
def briefing():

    try:

        ref = db.reference("incidents")
        data = ref.get()

        if not data:

            return jsonify({
                "briefing": "No active incidents."
            })

        active = []

        for value in data.values():

            if value.get("approved") and value.get("status") == "active":

                active.append(value)

        if not active:

            return jsonify({
                "briefing": "No active incidents currently."
            })

        summaries = "\n".join([
            f"{i.get('priority', 'P3')} "
            f"{i.get('crisis_type', 'other')} "
            f"at {i.get('location_name', 'Unknown')}"
            for i in active
        ])

        if model is None:

            fallback = "SYSTEM GENERATED BRIEFING\n\n"

            fallback += f"Active Incidents: {len(active)}\n\n"

            for incident in active:

                fallback += (
                    f"• {incident.get('priority')} | "
                    f"{incident.get('crisis_type')} | "
                    f"{incident.get('location_name')}\n"
                )

            fallback += (
                "\nRecommendation:\n"
                "Prioritize highest severity incidents."
            )

            return jsonify({
                "briefing": fallback
            })

        try:

            prompt = f"""
Create a city-wide emergency intelligence briefing.

Incident Data:

{summaries}

Provide:
1. Threat summary
2. Priority response order
3. Resource recommendation
4. Risk assessment

Keep concise.
"""

            response = model.generate_content(prompt)

            return jsonify({
                "briefing": response.text
            })

        except Exception as gemini_error:

            print("Gemini Briefing Error:", gemini_error)

            fallback = "SYSTEM GENERATED BRIEFING\n\n"

            fallback += f"Active Incidents: {len(active)}\n\n"

            p1 = 0
            p2 = 0
            p3 = 0

            for incident in active:

                priority = incident.get("priority", "P3")

                if priority == "P1":
                    p1 += 1
                elif priority == "P2":
                    p2 += 1
                else:
                    p3 += 1

                fallback += (
                    f"• {priority} | "
                    f"{incident.get('crisis_type')} | "
                    f"{incident.get('location_name')}\n"
                )

            fallback += "\nThreat Overview:\n"

            fallback += (
                f"P1 Critical: {p1}\n"
                f"P2 Moderate: {p2}\n"
                f"P3 Low: {p3}\n"
            )

            fallback += (
                "\nRecommendation:\n"
                "Respond to P1 incidents immediately."
            )

            return jsonify({
                "briefing": fallback
            })

    except Exception as e:

        print("Briefing Error:", e)

        return jsonify({
            "briefing": "System briefing unavailable."
        })

# ==========================
# WHATSAPP WEBHOOK
# ==========================
@app.route("/whatsapp", methods=["POST"])
def whatsapp():

    incoming = request.form.get("Body", "")

    if incoming.upper() == "HELP":

        reply = "Emergency services alerted. Call 112 immediately."

        return f"""
<Response>
<Message>{reply}</Message>
</Response>
"""

    if incoming.upper() == "YES":

        reply = "Glad you're safe. Incident logged."

        return f"""
<Response>
<Message>{reply}</Message>
</Response>
"""

    extract_with_gemini(incoming)

    reply = "Incident received. Reply YES or HELP."

    return f"""
<Response>
<Message>{reply}</Message>
</Response>
"""

# ==========================
# SERVER
# ==========================
if __name__ == "__main__":

    app.run(
        debug=True,
        port=5000
    )