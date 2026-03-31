import json
import re
from groq import Groq
from config import GROQ_API_KEY, GROQ_MODEL
from prompts.templates import GENERATE_QUESTIONS_PROMPT, EVALUATE_ANSWER_PROMPT


client = Groq(api_key=GROQ_API_KEY)


def generate_questions(role: str, difficulty: str, count: int) -> list[str]:
    """Generate interview questions using Groq LLM."""
    prompt = GENERATE_QUESTIONS_PROMPT.format(
        role=role, difficulty=difficulty, count=count
    )

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a technical interviewer. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=2000,
        )

        content = response.choices[0].message.content.strip()
        # Extract JSON array from response
        match = re.search(r'\[.*\]', content, re.DOTALL)
        if match:
            questions = json.loads(match.group())
            return questions[:count]
        return json.loads(content)[:count]

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
