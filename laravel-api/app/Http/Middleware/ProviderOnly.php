<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ProviderOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || $user->role !== 'provider') {
            return response()->json([
                'success' => false,
                'message' => 'Access denied. Provider account required.',
            ], 403);
        }

        return $next($request);
    }
}
