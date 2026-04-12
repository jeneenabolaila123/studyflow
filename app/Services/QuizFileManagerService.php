<?php

namespace App\Services;

use Illuminate\Support\Facades\File;

class QuizFileManagerService
{
    protected string $extension = '.quiz';
    protected string $backupSuffix = '.backup';
    protected int $maxFileSize = 104857600; // 100MB

    // =========================
    // SAVE
    // =========================
    public function saveQuizDeck(array $deck, string $filePath): void
    {
        if (empty($deck) || empty($deck['questions'])) {
            throw new \Exception("Invalid quiz deck");
        }

        $filePath = $this->ensureExtension($filePath);

        if (!File::exists(dirname($filePath))) {
            File::makeDirectory(dirname($filePath), 0777, true);
        }

        $this->backup($filePath);

        try {
            $json = json_encode($deck, JSON_UNESCAPED_UNICODE);

            if (!$json) {
                throw new \Exception("Invalid data");
            }

            File::put($filePath, $json);

            $size = filesize($filePath);

            if ($size === 0) {
                throw new \Exception("File empty after save");
            }

            if ($size > $this->maxFileSize) {
                throw new \Exception("File too large");
            }
        } catch (\Throwable $e) {
            $this->restoreBackup($filePath);
            throw new \Exception("Save failed: " . $e->getMessage());
        }
    }

    // =========================
    // LOAD
    // =========================
    public function loadQuizDeck(string $filePath): array
    {
        $filePath = trim($filePath);

        if (!file_exists($filePath)) {
            throw new \Exception("File not found");
        }

        if (!is_readable($filePath)) {
            throw new \Exception("Permission denied");
        }

        $size = filesize($filePath);

        if ($size === 0) {
            throw new \Exception("File empty");
        }

        if ($size > $this->maxFileSize) {
            throw new \Exception("File too large");
        }

        try {
            $data = json_decode(file_get_contents($filePath), true);

            if (!is_array($data) || !isset($data['questions'])) {
                throw new \Exception("Invalid format");
            }

            $this->validate($data);

            return $data;
        } catch (\Throwable $e) {
            throw new \Exception("Load failed: " . $e->getMessage());
        }
    }

    // =========================
    // VALIDATION
    // =========================
    public function isValidQuizFile(string $filePath): bool
    {
        try {
            if (!file_exists($filePath)) return false;
            if (filesize($filePath) === 0) return false;
            if (!str_ends_with($filePath, $this->extension)) return false;

            $deck = $this->loadQuizDeck($filePath);

            return !empty($deck['questions']);
        } catch (\Throwable $e) {
            return false;
        }
    }

    // =========================
    // EXPORT CSV
    // =========================
    public function exportToCsv(array $deck, string $filePath): void
    {
        if (empty($deck['questions'])) {
            throw new \Exception("Empty deck");
        }

        $file = fopen($filePath, 'w');

        fputcsv($file, ['Question', 'A', 'B', 'C', 'D', 'Correct']);

        foreach ($deck['questions'] as $q) {
            $opts = array_pad($q['options'] ?? [], 4, '');

            fputcsv($file, [
                $q['question_text'],
                $opts[0],
                $opts[1],
                $opts[2],
                $opts[3],
                $q['correct_answer_index']
            ]);
        }

        fclose($file);
    }

    // =========================
    // EXPORT TEXT
    // =========================
    public function exportToText(array $deck, string $filePath): void
    {
        if (empty($deck['questions'])) {
            throw new \Exception("Empty deck");
        }

        $output = "";

        foreach ($deck['questions'] as $i => $q) {
            $output .= ($i + 1) . ". " . $q['question_text'] . "\n";

            foreach ($q['options'] as $j => $opt) {
                $letter = chr(65 + $j);
                $mark = ($j == $q['correct_answer_index']) ? " ✔" : "";
                $output .= "{$letter}) {$opt}{$mark}\n";
            }

            $output .= "\n";
        }

        file_put_contents($filePath, $output);
    }

    // =========================
    // HELPERS
    // =========================
    protected function ensureExtension(string $path): string
    {
        return str_ends_with($path, $this->extension)
            ? $path
            : $path . $this->extension;
    }

    protected function backup(string $path): void
    {
        if (file_exists($path)) {
            copy($path, $path . $this->backupSuffix);
        }
    }

    protected function restoreBackup(string $path): void
    {
        $backup = $path . $this->backupSuffix;

        if (file_exists($backup)) {
            rename($backup, $path);
        }
    }

    protected function validate(array $deck): void
    {
        foreach ($deck['questions'] as $i => $q) {

            if (empty($q['question_text'])) {
                throw new \Exception("Q" . ($i + 1) . " empty");
            }

            if (empty($q['options'])) {
                throw new \Exception("Q" . ($i + 1) . " no options");
            }

            if (!isset($q['correct_answer_index'])) {
                throw new \Exception("Q" . ($i + 1) . " no correct answer");
            }
        }
    }
}
