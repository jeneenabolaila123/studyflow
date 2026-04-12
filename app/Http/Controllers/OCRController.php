<?php

namespace App\Http\Controllers;

use thiagoalessio\TesseractOCR\TesseractOCR;

class OCRController extends Controller
{
    public function readPdf()
    {
        $pdf = storage_path('app/file.pdf');
        $output = storage_path('app/page');

        $command = "\"C:\\Users\\obaid\\Downloads\\Release-25.12.0-0\\poppler-25.12.0\\Library\\bin\\pdftoppm.exe\" -png \"$pdf\" \"$output\"";

        exec($command);

        $image = storage_path('app/page-1.png');

        if (!file_exists($image)) {
            return "Image not created";
        }

        $text = (new TesseractOCR($image))
            ->executable("C:\\Program Files\\Tesseract-OCR\\tesseract.exe")
            ->run();

        return $text;
    }
}
