<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'phone' => $this->phone,
            'avatar' => $this->getAvatarUrl(),
            'is_admin' => (bool) $this->is_admin,
            'status' => $this->status,
            'email_verified_at' => $this->email_verified_at,
            'is_verified' => $this->isVerified(),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
