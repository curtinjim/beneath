<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
class AuthController extends Controller {
    public function login(Request $request): JsonResponse {
        $request->validate(['email'=>'required|email','password'=>'required']);
        $user = User::withoutGlobalScopes()->where('email',$request->email)->first();
        if (!$user || !Hash::check($request->password,$user->password)) {
            throw ValidationException::withMessages(['email'=>['Invalid credentials.']]);
        }
        $user->update(['last_login_at'=>now()]);
        $token = $user->createToken('auth')->plainTextToken;
        return response()->json(['data'=>['token'=>$token,'user'=>$user]]);
    }
    public function logout(Request $request): JsonResponse {
        $request->user()->currentAccessToken()->delete();
        return response()->json(null,204);
    }
    public function user(Request $request): JsonResponse {
        return response()->json(['data'=>$request->user()]);
    }
}
