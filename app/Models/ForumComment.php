<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ForumComment extends Model
{
    protected $table = 'forum_comments';

    protected $guarded = [];

    public function thread()
    {
        return $this->belongsTo(ForumThread::class, 'thread_id');
    }
}
