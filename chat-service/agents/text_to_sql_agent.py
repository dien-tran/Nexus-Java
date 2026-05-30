class TextToSqlAgent:
    selected_agent = "text_to_sql_disabled"

    def answer_disabled(self) -> str:
        return (
            "Mình chưa hỗ trợ truy vấn dữ liệu phức tạp bằng text-to-SQL ở V1. "
            "Bạn có thể hỏi theo task, plan, deadline, trạng thái hoặc thống kê cơ bản."
        )
