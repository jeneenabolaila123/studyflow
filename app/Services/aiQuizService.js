import axios from "axios";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

const aiQuizService = {
  async generateQuiz(prompt) {
    try {
      const response = await axios.post(`${API_BASE}/ai/quiz`, { prompt });

      if (!response?.data) {
        return null;
      }

      return response.data.questions || response.data || null;
    } catch (error) {
      console.error("AI quiz generation error:", error);
      return null;
    }
  },
};

export default aiQuizService;