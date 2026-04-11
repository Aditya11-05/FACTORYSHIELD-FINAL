"""
FactoryShield — chatbot.py
GenAI assistant using Groq (Llama) via LangChain.
Falls back to rule-based engine if no API key.
"""

import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

GROQ_API_KEY   = os.getenv("GROQ_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

MACHINE_LOGS = {
    "CNC-01": {"status": "Warning",  "last_failure": "Tool Wear Failure",   "anomaly_score": 72, "tool_wear": 210, "torque": 58},
    "CNC-02": {"status": "Normal",   "last_failure": "None",                "anomaly_score": 18, "tool_wear": 45,  "torque": 35},
    "CNC-03": {"status": "Critical", "last_failure": "Heat Dissipation",    "anomaly_score": 88, "tool_wear": 190, "torque": 62},
    "CNC-04": {"status": "Warning",  "last_failure": "Power Failure",       "anomaly_score": 65, "tool_wear": 155, "torque": 67},
    "CNC-05": {"status": "Normal",   "last_failure": "None",                "anomaly_score": 22, "tool_wear": 80,  "torque": 38},
    "CNC-06": {"status": "Critical", "last_failure": "Heat Dissipation",    "anomaly_score": 91, "tool_wear": 200, "torque": 70},
    "CNC-07": {"status": "Normal",   "last_failure": "None",                "anomaly_score": 44, "tool_wear": 110, "torque": 42},
    "CNC-08": {"status": "Warning",  "last_failure": "Overstrain Failure",  "anomaly_score": 58, "tool_wear": 165, "torque": 61},
    "CNC-09": {"status": "Normal",   "last_failure": "None",                "anomaly_score": 12, "tool_wear": 55,  "torque": 33},
    "CNC-10": {"status": "Critical", "last_failure": "Tool Wear Failure",   "anomaly_score": 84, "tool_wear": 230, "torque": 66},
    "CNC-11": {"status": "Normal",   "last_failure": "None",                "anomaly_score": 33, "tool_wear": 90,  "torque": 37},
    "CNC-12": {"status": "Warning",  "last_failure": "Power Failure",       "anomaly_score": 77, "tool_wear": 175, "torque": 64},
}

SYSTEM_PROMPT = """You are FactoryShield AI, an expert industrial predictive maintenance assistant.
You help factory engineers understand machine failures, anomaly scores, and maintenance needs.

Current machine fleet status:
{machine_context}

Guidelines:
- Be concise and technical
- Always reference specific machine IDs when relevant  
- Give actionable maintenance recommendations
- Explain failure types clearly (TWF=Tool Wear, HDF=Heat Dissipation, PWF=Power Failure, OSF=Overstrain, RNF=Random)
- Use anomaly scores: >80 = Critical, 50-80 = Warning, <50 = Normal
- Tool wear limit is 200 min — above this is critical
"""

def _build_machine_context() -> str:
    lines = []
    for mid, d in MACHINE_LOGS.items():
        lines.append(
            f"- {mid}: status={d['status']}, anomaly={d['anomaly_score']}%, "
            f"tool_wear={d['tool_wear']}min, torque={d['torque']}Nm, "
            f"last_failure={d['last_failure']}"
        )
    return "\n".join(lines)


def _rule_based_response(message: str) -> str:
    msg = message.lower()

    for machine_id, data in MACHINE_LOGS.items():
        if machine_id.lower() in msg:
            if any(w in msg for w in ["fail", "why", "cause", "broke", "problem"]):
                return (
                    f"**{machine_id} Failure Analysis**\n\n"
                    f"Last recorded failure: **{data['last_failure']}**\n"
                    f"Current anomaly score: **{data['anomaly_score']}%**\n"
                    f"Tool wear: **{data['tool_wear']} min** | Torque: **{data['torque']} Nm**\n\n"
                    f"Root cause: {'Excessive tool wear beyond 200 min threshold.' if data['tool_wear'] > 200 else 'Elevated torque causing mechanical stress.'}\n"
                    f"Recommendation: {'Replace tooling immediately and inspect spindle.' if data['tool_wear'] > 200 else 'Inspect cooling system and reduce load.'}"
                )
            elif any(w in msg for w in ["health", "status", "condition", "how is"]):
                return (
                    f"**{machine_id} Health Report**\n\n"
                    f"Status: **{data['status']}**\n"
                    f"Anomaly Score: **{data['anomaly_score']}%**\n"
                    f"Tool Wear: **{data['tool_wear']} min** / 250 min limit\n"
                    f"Torque: **{data['torque']} Nm**\n\n"
                    + ("🔴 Immediate inspection required." if data["status"] == "Critical"
                       else "🟡 Monitor closely, schedule maintenance soon." if data["status"] == "Warning"
                       else "✅ Operating within normal parameters.")
                )

    if any(w in msg for w in ["maintenance", "service", "fix", "repair", "schedule"]):
        critical = [m for m, d in MACHINE_LOGS.items() if d["status"] == "Critical"]
        warning  = [m for m, d in MACHINE_LOGS.items() if d["status"] == "Warning"]
        return (
            f"**Maintenance Priority List**\n\n"
            f"🔴 **Immediate (Critical):** {', '.join(critical) or 'None'}\n"
            f"🟡 **Within 48h (Warning):** {', '.join(warning) or 'None'}\n\n"
            f"**Recommended actions:**\n"
            f"• Critical: take offline immediately, full inspection\n"
            f"• Warning: monitor closely, schedule maintenance\n"
            f"• Check tool wear, coolant flow, and electrical connections"
        )

    if any(w in msg for w in ["anomaly", "report", "scores", "abnormal"]):
        anomalous = sorted(
            [(m, d["anomaly_score"], d["status"]) for m, d in MACHINE_LOGS.items() if d["anomaly_score"] > 40],
            key=lambda x: x[1], reverse=True
        )
        lines = "\n".join(f"• {m}: {s}% — {st}" for m, s, st in anomalous)
        return f"**Fleet Anomaly Report**\n\n{lines}"

    if any(w in msg for w in ["tool wear", "twf", "wear"]):
        return (
            "**Tool Wear Failure (TWF)**\n\n"
            "Occurs when cumulative tool wear exceeds ~200 minutes.\n"
            "The cutting tool degrades → dimensional inaccuracies + vibration.\n\n"
            "**Prevention:** Replace tools before 200 min threshold.\n"
            "**Affected now:** " + ", ".join(m for m, d in MACHINE_LOGS.items() if d["tool_wear"] > 180)
        )

    if any(w in msg for w in ["heat", "temperature", "hdf", "cooling"]):
        return (
            "**Heat Dissipation Failure (HDF)**\n\n"
            "Triggered when process-air temperature difference exceeds ~13K.\n"
            "Causes thermal expansion and potential seizure.\n\n"
            "**Prevention:** Check coolant flow, clean heat exchangers, verify lubrication."
        )

    if any(w in msg for w in ["power", "electrical", "pwf", "motor", "overload"]):
        return (
            "**Power Failure (PWF)**\n\n"
            "Occurs when torque × rotational speed exceeds safe limits.\n"
            "Results in motor overload or drive fault.\n\n"
            "**Prevention:** Reduce cutting parameters, inspect motor windings."
        )

    if any(w in msg for w in ["all machines", "fleet", "overview", "summary"]):
        critical = sum(1 for d in MACHINE_LOGS.values() if d["status"] == "Critical")
        warning  = sum(1 for d in MACHINE_LOGS.values() if d["status"] == "Warning")
        normal   = sum(1 for d in MACHINE_LOGS.values() if d["status"] == "Normal")
        return (
            f"**Fleet Overview — {len(MACHINE_LOGS)} Machines**\n\n"
            f"🔴 Critical: {critical} machines\n"
            f"🟡 Warning: {warning} machines\n"
            f"✅ Normal: {normal} machines\n\n"
            f"Critical machines: {', '.join(m for m,d in MACHINE_LOGS.items() if d['status']=='Critical')}\n"
            f"Average anomaly score: {sum(d['anomaly_score'] for d in MACHINE_LOGS.values()) // len(MACHINE_LOGS)}%"
        )

    return (
        "I'm **FactoryShield AI** — your predictive maintenance assistant.\n\n"
        "Try asking me:\n"
        "• *'Why did CNC-03 fail?'*\n"
        "• *'Health of CNC-01'*\n"
        "• *'Which machines need maintenance?'*\n"
        "• *'Show anomaly report'*\n"
        "• *'Explain tool wear failure'*\n"
        "• *'Fleet overview'*"
    )


async def chat_with_engineer(message: str, conversation_history: list = None) -> str:
    if conversation_history is None:
        conversation_history = []

    machine_context = _build_machine_context()

    # ── Try Groq (Llama 3) ────────────────────────────────────────────────────
    if GROQ_API_KEY:
        try:
            from langchain_groq import ChatGroq
            from langchain.schema import SystemMessage, HumanMessage, AIMessage

            llm = ChatGroq(
                model="llama-3.3-70b-versatile",
                api_key=GROQ_API_KEY,
                temperature=0.3,
                max_tokens=1024,
            )

            system = SystemMessage(content=SYSTEM_PROMPT.format(machine_context=machine_context))

            history = []
            for m in conversation_history[-6:]:
                if m["role"] == "user":
                    history.append(HumanMessage(content=m["content"]))
                else:
                    history.append(AIMessage(content=m["content"]))

            response = await llm.ainvoke([system] + history + [HumanMessage(content=message)])
            return response.content

        except Exception as e:
            print(f"[Groq error] {e} — falling back to rule-based")

    # ── Try OpenAI ────────────────────────────────────────────────────────────
    if OPENAI_API_KEY:
        try:
            from langchain_openai import ChatOpenAI
            from langchain.schema import SystemMessage, HumanMessage, AIMessage

            llm = ChatOpenAI(model="gpt-3.5-turbo", api_key=OPENAI_API_KEY, temperature=0.3)

            system  = SystemMessage(content=SYSTEM_PROMPT.format(machine_context=machine_context))
            history = []
            for m in conversation_history[-6:]:
                if m["role"] == "user":
                    history.append(HumanMessage(content=m["content"]))
                else:
                    history.append(AIMessage(content=m["content"]))

            response = await llm.ainvoke([system] + history + [HumanMessage(content=message)])
            return response.content

        except Exception as e:
            print(f"[OpenAI error] {e} — falling back to rule-based")

    # ── Rule-based fallback ───────────────────────────────────────────────────
    return _rule_based_response(message)
