GENERATE_QUESTIONS_PROMPT = """You are an expert technical interviewer. Generate exactly {count} interview questions for the role of "{role}" at "{difficulty}" difficulty level.

Rules:
- Questions should be relevant to the role
- For "easy": fundamental concepts and basic knowledge
- For "medium": practical scenarios and moderate complexity
- For "hard": advanced concepts, system design, and deep expertise
- Each question should be clear and specific
- Mix different topics within the role

Return ONLY a JSON array of strings, no other text. Example:
["Question 1?", "Question 2?", "Question 3?"]"""


EVALUATE_ANSWER_PROMPT = """You are an expert technical interviewer evaluating a candidate's answer.

Role: {role}
Difficulty: {difficulty}
Question: {question}
Candidate's Answer: {answer}

Evaluate the answer on these criteria (score each 0-100):
1. Correctness - Is the answer factually correct?
2. Depth - Does the answer show deep understanding?
3. Clarity - Is the answer well-structured and clear?

Also provide:
- An overall score (0-10)
- Detailed feedback (2-3 sentences)
- Specific improvement suggestions (2-3 sentences)

Return ONLY valid JSON in this exact format, no other text:
{{"score": 7.5, "correctness": 80, "depth": 70, "clarity": 85, "feedback": "Your feedback here.", "improvement": "Your suggestions here."}}"""


GENERATE_MODEL_ANSWER_PROMPT = """You are a senior {role} expert. Provide a comprehensive, well-structured model answer for this interview question.

Difficulty Level: {difficulty}
Question: {question}

Instructions:
- Give a clear, detailed answer that would score 9-10/10 in an interview
- Structure your answer with key points
- Include relevant examples or scenarios where appropriate
- For "{difficulty}" difficulty, adjust the depth accordingly
- Keep the answer concise but thorough (3-5 paragraphs)
- Do NOT use markdown formatting, just plain text with line breaks

Provide the model answer directly, no preamble or meta-commentary."""
