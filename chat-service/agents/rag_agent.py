class RagAgent:
    selected_agent = "rag_disabled"

    def answer_disabled(self) -> str:
        return "Mình chưa hỗ trợ hỏi đáp tài liệu/RAG ở V1."
