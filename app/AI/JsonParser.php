<?php

namespace App\AI;

class JsonParser
{
    public function parse(string $text):?array
    {
        preg_match('/\{(?:[^{}]|(?R))*\}/',$text,$matches);

        if(!$matches) return null;

        $json = json_decode($matches[0],true);

        if(!$json) return null;

        return $json;
    }
}
