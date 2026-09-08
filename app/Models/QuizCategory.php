<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuizCategory extends Model
{
    protected $table = 'quiz_categories';

    protected $guarded = [];

    public function questions()
    {
        return $this->hasMany(QuizQuestion::class, 'category_id');
    }

    public function questions()
    {
        return $this->hasMany(QuizQuestion::class, 'category_id');
    }
}
