<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ContactController;
use App\Http\Controllers\Api\V1\CompanyController;
use App\Http\Controllers\Api\V1\GovernmentController;
use App\Http\Controllers\Api\V1\ActorRelationshipController;
use App\Http\Controllers\Api\V1\BehaviouralEventController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\ProjectMembershipController;
use App\Http\Controllers\Api\V1\ProjectActorController;
use App\Http\Controllers\Api\V1\NarrativeSynthesisController;
use App\Http\Controllers\Api\V1\SignalRelevanceController;
use App\Http\Controllers\Api\V1\HarvestingController;
use App\Http\Controllers\Api\V1\SignalController;
use App\Http\Controllers\Api\V1\InteractionController;
use App\Http\Controllers\Api\V1\TaskController;
use App\Http\Controllers\Api\V1\AiController;
use App\Http\Controllers\Api\V1\DivergenceController;
use App\Http\Controllers\Api\V1\EnrichmentController;
use App\Http\Controllers\Api\V1\SourceController;
use App\Http\Controllers\Api\V1\TrajectoryController;
use App\Http\Controllers\Api\V1\ChatController;
use App\Http\Controllers\Api\V1\SynthesisController;
use App\Http\Controllers\Api\V1\ActorIntelController;
use App\Http\Controllers\Api\V1\NetworkController;
use App\Http\Controllers\Api\V1\CrossContradictionController;
use App\Http\Controllers\Api\V1\TerrainController;
use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\ProvenanceController;
use App\Http\Controllers\Api\V1\Mail\OAuthController;
use App\Http\Controllers\Api\V1\Mail\ThreadController;
use App\Http\Controllers\Api\V1\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\V1\Admin\TenantController as AdminTenantController;
use App\Http\Controllers\Api\V1\RegistrationController;
use App\Http\Controllers\Api\V1\TeamController;
use App\Http\Controllers\Api\V1\BillingController;
use App\Http\Controllers\Api\V1\TenantController as TenantApiController;

Route::prefix('v1')->group(function () {
    // Auth
    Route::post('auth/login', [AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/user', [AuthController::class, 'user']);

        // Actors
        Route::apiResource('contacts', ContactController::class);
        Route::apiResource('companies', CompanyController::class);
        Route::apiResource('governments', GovernmentController::class);

        // Relationships
        Route::get('actors/{actorId}/relationships', [ActorRelationshipController::class, 'index']);
        Route::post('actors/{actorId}/relationships', [ActorRelationshipController::class, 'store']);
        Route::put('relationships/{id}', [ActorRelationshipController::class, 'update']);
        Route::delete('relationships/{id}', [ActorRelationshipController::class, 'destroy']);

        // Events
        Route::get('actors/{actorId}/events', [BehaviouralEventController::class, 'index']);
        Route::post('actors/{actorId}/events', [BehaviouralEventController::class, 'store']);
        Route::get('events/{id}', [BehaviouralEventController::class, 'show']);
        Route::put('events/{id}', [BehaviouralEventController::class, 'update']);

        // Evidentiary chain (BD-74)
        Route::get('events/{id}/provenance', [ProvenanceController::class, 'show']);

        // Projects — core CRUD
        Route::apiResource('projects', ProjectController::class)->except(['destroy']);
        Route::get('projects/{projectId}/members', [ProjectMembershipController::class, 'index']);
        Route::post('projects/{projectId}/members', [ProjectMembershipController::class, 'store']);
        Route::delete('projects/{projectId}/members/{userId}', [ProjectMembershipController::class, 'destroy']);

        // Project actor linkage (BD-64)
        Route::get('projects/{projectId}/actors',              [ProjectActorController::class, 'index']);
        Route::post('projects/{projectId}/actors',             [ProjectActorController::class, 'store']);
        Route::put('projects/{projectId}/actors/{actorId}',    [ProjectActorController::class, 'update']);
        Route::delete('projects/{projectId}/actors/{actorId}', [ProjectActorController::class, 'destroy']);

        // Narrative synthesis (BD-66)
        Route::get('projects/{projectId}/narrative',  [NarrativeSynthesisController::class, 'show']);
        Route::post('projects/{projectId}/narrative', [NarrativeSynthesisController::class, 'generate']);

        // Signal relevance scoring (BD-65)
        Route::get('projects/{projectId}/signals',        [SignalRelevanceController::class, 'index']);
        Route::post('projects/{projectId}/signals/score', [SignalRelevanceController::class, 'score']);

        // Audit log (BD-73)
        Route::get('audit-log', [AuditLogController::class, 'index']);

        // Harvesting — per-actor
        Route::post('actors/{actorId}/harvest',          [HarvestingController::class, 'trigger']);
        Route::get('actors/{actorId}/harvesting-runs',   [HarvestingController::class, 'runs']);
        Route::get('actors/{actorId}/signals',           [HarvestingController::class, 'actorSignals']);
        // Harvesting — global
        Route::get('harvesting/status',                  [HarvestingController::class, 'status']);
        // Signals — review actions
        Route::get('signals',                            [SignalController::class, 'index']);
        Route::post('signals/bulk-accept',               [SignalController::class, 'bulkAccept']);
        Route::post('signals/bulk-dismiss',              [SignalController::class, 'bulkDismiss']);
        Route::post('signals/{id}/accept',               [SignalController::class, 'accept']);
        Route::post('signals/{id}/accept-edit',          [SignalController::class, 'acceptEdit']);
        Route::post('signals/{id}/dismiss',              [SignalController::class, 'dismiss']);
        Route::post('signals/{id}/snooze',               [SignalController::class, 'snooze']);
        Route::post('signals/{id}/flag-review',          [SignalController::class, 'flagReview']);
        Route::post('signals/{id}/promote',              [SignalController::class, 'promote']);

        // Sources / DISTIL pipeline
        Route::get('sources',                          [SourceController::class, 'index']);
        Route::post('sources/ingest-url',              [SourceController::class, 'ingestUrl']);
        Route::post('sources/ingest-file',             [SourceController::class, 'ingestFile']);
        Route::post('sources/meeting-note',            [SourceController::class, 'meetingNote']);   // BD-79
        Route::post('sources/observation',             [SourceController::class, 'observation']);   // BD-80
        Route::post('sources/ingest-voice',            [SourceController::class, 'ingestVoice']);   // BD-81
        Route::get('sources/{id}',                     [SourceController::class, 'show']);
        Route::delete('sources/{id}',                  [SourceController::class, 'destroy']);
        Route::post('sources/{id}/commit',             [SourceController::class, 'commit']);
        Route::delete('intelligence-commits/{id}',     [SourceController::class, 'revertCommit']);

        // Trajectory (BD-30)
        Route::get('actors/{actorId}/trajectory',  [TrajectoryController::class, 'show']);
        Route::post('actors/{actorId}/trajectory', [TrajectoryController::class, 'compute']);

        // Split detection (BD-31) + Canary marker (BD-32)
        Route::post('actors/{actorId}/split',          [ActorIntelController::class, 'computeSplit']);
        Route::post('actors/{actorId}/split/confirm',  [ActorIntelController::class, 'confirmSplit']);
        Route::delete('actors/{actorId}/split',        [ActorIntelController::class, 'dismissSplit']);
        Route::post('actors/{actorId}/canary',         [ActorIntelController::class, 'computeCanary']);
        Route::post('actors/{actorId}/canary/confirm', [ActorIntelController::class, 'setCanary']);
        Route::delete('actors/{actorId}/canary',       [ActorIntelController::class, 'clearCanary']);

        // Actor briefing — BD-126 (must be before actorId wildcard subroutes to be safe)
        Route::post('actors/{actorId}/brief',          [SynthesisController::class, 'actorBrief']);  // BD-126

        // Network intelligence (BD-53)
        Route::get('actors/{actorId}/network', [NetworkController::class, 'show']);

        // Cross-contradiction detection (BD-54)
        Route::get('actors/{actorId}/cross-contradictions',  [CrossContradictionController::class, 'show']);
        Route::post('actors/{actorId}/cross-contradictions', [CrossContradictionController::class, 'compute']);

        // Terrain (BD-34)
        Route::get('actors/{actorId}/terrain',    [TerrainController::class, 'index']);
        Route::post('actors/{actorId}/terrain',   [TerrainController::class, 'store']);
        Route::put('terrain/{id}',                [TerrainController::class, 'update']);
        Route::delete('terrain/{id}',             [TerrainController::class, 'destroy']);

        // Interactions
        Route::get('actors/{actorId}/interactions', [InteractionController::class, 'index']);
        Route::post('actors/{actorId}/interactions', [InteractionController::class, 'store']);
        Route::get('interactions/{id}', [InteractionController::class, 'show']);
        Route::put('interactions/{id}', [InteractionController::class, 'update']);
        Route::delete('interactions/{id}', [InteractionController::class, 'destroy']);

        // Divergence
        Route::get('actors/{actorId}/divergence',  [DivergenceController::class, 'show']);
        Route::post('actors/{actorId}/divergence', [DivergenceController::class, 'compute']);

        // Enrichment
        Route::post('actors/{actorId}/enrichment',       [EnrichmentController::class, 'trigger']);
        Route::get('actors/{actorId}/enrichment',        [EnrichmentController::class, 'status']);
        Route::post('actors/{actorId}/enrichment/apply', [EnrichmentController::class, 'applyField']);
        Route::post('enrichment/preview',                [EnrichmentController::class, 'preview']); // BD-33

        // Tasks
        Route::get('actors/{actorId}/tasks', [TaskController::class, 'index']);
        Route::post('actors/{actorId}/tasks', [TaskController::class, 'store']);
        Route::put('tasks/{id}', [TaskController::class, 'update']);

        // AI operations
        Route::prefix('ai')->middleware('throttle:10,1')->group(function () {
            Route::post('significance',    [AiController::class, 'significance']);
            Route::post('divergence',      [AiController::class, 'divergence']);
            Route::post('entities',        [AiController::class, 'entities']);
            Route::post('suggest-grade',   [AiController::class, 'suggestGrade']);
            Route::post('leverage-read',   [AiController::class, 'leverageRead']);  // BD-38
        });

        // Mail
        Route::prefix('mail')->group(function () {
            Route::get('accounts',                       [ThreadController::class, 'accounts']);
            Route::post('accounts/{accountId}/sync',     [ThreadController::class, 'sync']);
            Route::delete('accounts/{accountId}',        [OAuthController::class, 'disconnect']);
            Route::get('gmail/auth',                     [OAuthController::class, 'gmailRedirect']);
            Route::get('m365/auth',                      [OAuthController::class, 'm365Redirect']);
            Route::get('threads',                        [ThreadController::class, 'index']);
            Route::get('threads/{id}',                   [ThreadController::class, 'show']);
            Route::post('threads/{id}/link-actor',       [ThreadController::class, 'linkActor']);
            Route::post('threads/{id}/cross-boundary',   [ThreadController::class, 'crossBoundary']);
        });

        // Phase 4: Tenant, Team, Billing
        Route::get('/tenant', [TenantApiController::class, 'show']);
        Route::patch('/tenant', [TenantApiController::class, 'update']);
        Route::post('/tenant/complete-onboarding', [TenantApiController::class, 'completeOnboarding']);
        Route::get('/tenant/ai-config', [TenantApiController::class, 'aiConfig']);
        Route::put('/tenant/ai-config', [TenantApiController::class, 'updateAiConfig']);
        Route::get('/tenant/usage', [TenantApiController::class, 'usage']);
        Route::get('/team/members', [TeamController::class, 'members']);
        Route::patch('/team/members/{user}', [TeamController::class, 'updateMember']);
        Route::delete('/team/members/{user}', [TeamController::class, 'removeMember']);
        Route::get('/team/invitations', [TeamController::class, 'invitationsList']);
        Route::post('/team/invitations', [TeamController::class, 'invite']);
        Route::delete('/team/invitations/{invitation}', [TeamController::class, 'revokeInvitation']);
        Route::get('/billing', [BillingController::class, 'show']);
        Route::post('/billing/checkout', [BillingController::class, 'checkout']);
        Route::post('/billing/portal', [BillingController::class, 'portal']);
        Route::prefix('admin')->group(function () {
            Route::apiResource('users', AdminUserController::class)->except(['show']);
            Route::get('tenant', [AdminTenantController::class, 'show']);
            Route::put('tenant', [AdminTenantController::class, 'update']);
        });

        // Chat (BD-86, BD-104)
        Route::get('chat/sessions',                         [ChatController::class, 'index']);
        Route::post('chat/sessions',                        [ChatController::class, 'store']);
        Route::get('chat/sessions/{id}',                    [ChatController::class, 'show']);
        Route::patch('chat/sessions/{id}',                  [ChatController::class, 'update']);
        Route::delete('chat/sessions/{id}',                 [ChatController::class, 'destroy']);
        Route::post('chat/sessions/{id}/messages',          [ChatController::class, 'sendMessage']);
        Route::post('chat/sessions/{id}/synthesise',        [SynthesisController::class, 'synthesise']); // BD-126
    });
});
