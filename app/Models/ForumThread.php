<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ForumThread extends Model
{
    protected $table = 'forum_threads';

    protected $guarded = [];

    public function comments()
    {
        return $this->hasMany(ForumComment::class, 'thread_id');
    }
}
