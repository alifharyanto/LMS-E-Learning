<?php

namespace App\Http\Controllers;

use App\Models\QuizCategory;
use App\Models\QuizQuestion;
use App\Models\QuizResult;
use Illuminate\Http\Request;
use Illuminate\View\View;

class QuizController extends Controller
{
    public function index(Request $request): View
    {
        $categoryId = $request->integer('category_id') ?: null;
        if (! $categoryId) {
            return view('quiz', ['categories' => QuizCategory::query()->whereNull('parent_id')->withCount('questions')->orderBy('name')->get()]);
        }

        $category = QuizCategory::query()->findOrFail($categoryId);
        $questions = QuizQuestion::query()->where('category_id', $categoryId)->orderBy('id')->get();
        $result = null;
        $answers = [];

        if ($request->isMethod('post')) {
            $answers = $request->input('answers', []);
            $score = $questions->sum(fn ($question) => isset($answers[$question->id]) && (int) $answers[$question->id] === (int) $question->answer_index ? 1 : 0);
            $total = $questions->count();
            $percent = $total ? (int) (($score / $total) * 100) : 0;
            QuizResult::create(['user_id' => $request->user()->id, 'category_id' => $categoryId, 'score' => $score, 'total' => $total, 'percent' => $percent, 'correct_answers' => $score]);
            $result = compact('score', 'total', 'percent');
        }

        return view('quiz', compact('category', 'questions', 'result', 'answers'));
    }
}
