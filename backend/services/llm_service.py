import json
import re
import os
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL
from prompts.templates import GENERATE_QUESTIONS_PROMPT, EVALUATE_ANSWER_PROMPT, GENERATE_MODEL_ANSWER_PROMPT

# --- MLflow: Optional Integration ---
MLFLOW_ENABLED = os.getenv("MLFLOW_ENABLED", "false").lower() == "true"

if MLFLOW_ENABLED:
    try:
        import mlflow
        print("✅ MLflow tracking enabled")
    except ImportError:
        MLFLOW_ENABLED = False
        print("⚠️ MLflow not installed, tracking disabled")
else:
    print("ℹ️ MLflow tracking disabled (set MLFLOW_ENABLED=true to enable)")


client = Groq(api_key=GROQ_API_KEY)


def _mlflow_log(run_name: str, params: dict, texts: dict):
    """Helper to log to MLflow only if enabled."""
    if not MLFLOW_ENABLED:
        return
    try:
        with mlflow.start_run(run_name=run_name) as run:
            for k, v in params.items():
                mlflow.log_param(k, v)
            for filename, content in texts.items():
                mlflow.log_text(content, filename)
    except Exception as e:
        print(f"⚠️ MLflow logging failed: {e}")


def generate_questions(role: str, difficulty: str, count: int) -> list[str]:
    """Generate interview questions using Groq LLM."""
    prompt = GENERATE_QUESTIONS_PROMPT.format(
        role=role, difficulty=difficulty, count=count
    )

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are an expert technical interviewer."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500,
        )

        content = response.choices[0].message.content.strip()

        # Fix common LLM markdown wrapper issues
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```", "").strip()

        # Log to MLflow (non-blocking)
        _mlflow_log("generate_questions", {
            "role": role, "difficulty": difficulty, "model": GROQ_MODEL
        }, {"prompt.txt": prompt, "response.json": content})

        questions = json.loads(content)
        return questions[:count]

    except Exception as e:
        print(f"Error generating questions: {e}")
        # Fallback questions
        return [f"Explain a key concept in {role} (Question {i+1})." for i in range(count)]


def evaluate_answer(role: str, difficulty: str, question: str, answer: str) -> dict:
    """Evaluate a candidate's answer using Groq LLM."""
    prompt = EVALUATE_ANSWER_PROMPT.format(
        role=role, difficulty=difficulty, question=question, answer=answer
    )

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a technical interviewer evaluator. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=500,
        )

        content = response.choices[0].message.content.strip()

        # Log to MLflow (non-blocking)
        _mlflow_log("evaluate_answer", {
            "role": role, "difficulty": difficulty, "model": GROQ_MODEL
        }, {"eval_prompt.txt": prompt, "eval_response.json": content})

        # Extract JSON object from response
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            result = json.loads(match.group())
        else:
            result = json.loads(content)

        # Validate and clamp values
        return {
            "score": max(0, min(10, float(result.get("score", 5)))),
            "correctness": max(0, min(100, float(result.get("correctness", 50)))),
            "depth": max(0, min(100, float(result.get("depth", 50)))),
            "clarity": max(0, min(100, float(result.get("clarity", 50)))),
            "feedback": str(result.get("feedback", "Good attempt.")),
            "improvement": str(result.get("improvement", "Keep practicing."))
        }

    except Exception as e:
        print(f"Error evaluating answer: {e}")
        return {
            "score": 5.0,
            "correctness": 50,
            "depth": 50,
            "clarity": 50,
            "feedback": "We could not evaluate your answer at this time. Please try again.",
            "improvement": "Ensure your answer is detailed and relevant to the question."
        }


def generate_model_answer(role: str, difficulty: str, question: str) -> str:
    """Generate a model/ideal answer for any interview question using Groq LLM."""
    prompt = GENERATE_MODEL_ANSWER_PROMPT.format(
        role=role, difficulty=difficulty, question=question
    )

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a senior technical expert. Provide clear, comprehensive model answers to interview questions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.4,
            max_tokens=1500,
        )

        content = response.choices[0].message.content.strip()

        # Log to MLflow (non-blocking)
        _mlflow_log("generate_model_answer", {
            "role": role, "difficulty": difficulty, "model": GROQ_MODEL
        }, {"model_answer.txt": content})

        return content

    except Exception as e:
        print(f"Error generating model answer: {e}")
        return f"Sorry, I couldn't generate a model answer for this question right now. Please try again later."
