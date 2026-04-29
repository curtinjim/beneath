<?php
namespace App\Http\Controllers\Api\V1\Admin;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
class UserController extends Controller {
    public function index(Request $request): JsonResponse {
        return response()->json(['data' => User::orderBy('name')->get(['id','uuid','name','email','role','is_active','last_login_at'])]);
    }
    public function store(Request $request): JsonResponse {
        $request->validate(['name'=>'required|string','email'=>'required|email','role'=>'required|in:owner,admin,analyst,reviewer,guest','password'=>'required|string|min:8']);
        $user = User::withoutGlobalScopes()->create([
            'uuid' => (string) Str::uuid(),
            'tenant_id' => $request->user()->tenant_id,
            'name' => $request->name,
            'email' => $request->email,
            'role' => $request->role,
            'password' => Hash::make($request->password),
        ]);
        return response()->json(['data' => $user], 201);
    }
    public function update(Request $request, string $id): JsonResponse {
        $user = User::findOrFail($id);
        $data = $request->only(['name','role','is_active']);
        if ($request->filled('password')) $data['password'] = Hash::make($request->password);
        $user->update($data);
        return response()->json(['data' => $user]);
    }
    public function destroy(string $id): JsonResponse {
        User::findOrFail($id)->update(['is_active' => false]);
        return response()->json(null, 204);
    }
}
