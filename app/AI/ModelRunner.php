<?php

namespace App\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ModelRunner
{
    private array $models = [

        'qwen:0.5b'
    ];

    public function run(string $prompt):?string
    {
        foreach($this->models as $model){

            try{

                Log::info("Running model",["model"=>$model]);

                $response = Http::timeout(180)
                    ->connectTimeout(10)
                    ->retry(2,2000)
                    ->post("http://127.0.0.1:11434/api/generate",[
                        "model"=>$model,
                        "prompt"=>$prompt,
                        "stream"=>false,
                        "options"=>[
                            "temperature"=>0.1,
                            "num_predict"=>100,
                            "top_p"=>0.9,
                            "num_ctx"=>1024
                        ]
                    ]);

                if(!$response->ok()) continue;

                $body = $response->json();

                if(!isset($body["response"])) continue;

                return $body["response"];

            }catch(\Exception $e){

                Log::error("Model error",[
                    "model"=>$model,
                    "error"=>$e->getMessage()
                ]);

                continue;
            }
        }

        return null;
    }
}
