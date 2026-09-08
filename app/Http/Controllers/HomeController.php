<?php

namespace App\Http\Controllers;

use App\Models\Faq;
use Illuminate\View\View;

class HomeController extends Controller
{
    public function index(): View
    {
        return view('home', [
            'faqs' => Faq::query()->latest('created_at')->limit(6)->get(),
        ]);
    }
}
