<?php

namespace App\Services;

class StudyPlannerService
{
    protected OllamaClientService $api;

    public function __construct(?OllamaClientService $api = null)
    {
        $this->api = $api ?: new OllamaClientService(
            env('OLLAMA_URL', 'http://127.0.0.1:11434'),
            'qwen3:1.7b',
            40
        );
    }

    public function generateStudyPlan(
        array $deck,
        int $targetCards = 30,
        int $availableTime = 60,
        ?array $focusAreas = null
    ): array {
        if (empty($deck) || empty($deck['questions'])) {
            throw new \InvalidArgumentException('Empty deck');
        }

        $analysis = $this->analyze($deck);

        if (!empty($focusAreas)) {
            $analysis['weak'] = array_values(array_unique(array_merge($focusAreas, $analysis['weak'])));
        }

        $sessions = $this->buildSessions($analysis, $targetCards);

        $totalTime = array_sum(array_map(
            fn($s) => (int)($s['estimated_time'] ?? 0),
            $sessions
        ));

        $advice = $this->generateShortAdvice($analysis);

        return [
            'total_cards' => $targetCards,
            'sessions' => $sessions,
            'daily_goal' => "Study {$targetCards} cards today",
            'focus_areas' => !empty($analysis['weak']) ? $analysis['weak'] : ['General'],
            'estimated_total_time' => $totalTime,
            'advice' => $advice,
        ];
    }

    protected function analyze(array $deck): array
    {
        $weak = [];
        $topics = [];

        foreach (($deck['questions'] ?? []) as $q) {
            $tags = $q['tags'] ?? [];

            if (!is_array($tags)) {
                $tags = [];
            }

            foreach ($tags as $tag) {
                $tag = trim((string)$tag);
                if ($tag === '') {
                    continue;
                }

                $topics[$tag] = ($topics[$tag] ?? 0) + 1;
            }

            $incorrectCount = (int)($q['incorrect_count'] ?? 0);
            if ($incorrectCount > 0) {
                foreach ($tags as $tag) {
                    $tag = trim((string)$tag);
                    if ($tag !== '') {
                        $weak[] = $tag;
                    }
                }
            }
        }

        arsort($topics);
        $sortedTopics = array_slice(array_keys($topics), 0, 5);
        $weak = array_slice(array_values(array_unique($weak)), 0, 5);

        return [
            'topics' => $sortedTopics,
            'weak' => $weak,
        ];
    }

    protected function buildSessions(array $analysis, int $targetCards): array
    {
        $sessions = [];

        $weakTopics = $analysis['weak'] ?? [];
        $topics = $analysis['topics'] ?? [];

        $allTopics = array_values(array_unique(array_merge(
            $weakTopics,
            array_values(array_filter($topics, fn($t) => !in_array($t, $weakTopics, true)))
        )));

        if (empty($allTopics)) {
            $allTopics = ['General'];
        }

        $cardsPerTopic = max(5, intdiv($targetCards, max(1, count($allTopics))));

        foreach ($allTopics as $i => $topic) {
            $sessions[] = [
                'topic' => $topic,
                'card_count' => $cardsPerTopic,
                'difficulty_focus' => $i > 0 ? 'MEDIUM' : 'EASY',
                'estimated_time' => $cardsPerTopic * 2,
                'priority' => in_array($topic, $weakTopics, true) ? 5 : 3,
            ];
        }

        return $sessions;
    }

    protected function generateShortAdvice(array $analysis): string
    {
        if (empty($analysis['weak'])) {
            return 'Keep practicing regularly.';
        }

        $weakTopics = implode(', ', $analysis['weak']);

        $prompt = <<<PROMPT
Give short study advice.

Weak topics: {$weakTopics}

Keep it very short.
PROMPT;

        try {
            return trim($this->api->generateText($prompt));
        } catch (\Throwable $e) {
            return 'Focus on weak topics.';
        }
    }

    public function getQuickStudySuggestion(?array $topics = null): string
    {
        $topicsText = !empty($topics) ? implode(', ', $topics) : 'general';
        return "Study 20 cards today focusing on {$topicsText}";
    }
}
