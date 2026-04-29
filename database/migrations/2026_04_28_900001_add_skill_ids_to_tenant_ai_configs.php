<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('tenant_ai_configs', function (Blueprint $table) {
            $table->json('skill_ids')->nullable();
        });

        $skillIds = json_encode([
            'maisie'                      => 'skill_01EcpNEmBbakHRMuqT3ERJQE',
            'pippa'                       => 'skill_01TbUbu8MWxRBNmvAH6CvTzR',
            'cate'                        => 'skill_01AcaSbRQhuaYnvuiEopmMpV',
            'lance'                       => 'skill_01VJLwsLmmwEu9B9aqB8fcmZ',
            'jack'                        => 'skill_01ANszmacPDDFmCrEocp8Rnk',
            'jackson'                     => 'skill_016WVYgWcCyHUkUX9wT88Ytj',
            'email-significance'          => 'skill_01Xmz4PhWcjKYUbzjLvo2JMF',
            'divergence-computation'      => 'skill_016ULhPd5up15Gqx86EAk2s8',
            'contradiction-detection'     => 'skill_01BzibLRWPZD4okxUzGevjdr',
            'news-summarisation'          => 'skill_01Gcr4d59eyTZc2XAnAQ5qw8',
            'entity-extraction'           => 'skill_01Q8bNH5nrGxn41r5RPTE8tB',
            'enrichment-field-generation' => 'skill_01Af6YJqW4hTj1KTHUSYtzFj',
            'leverage-read-suggestion'    => 'skill_01JhVxA483Eo2PNCuqFbwT6T',
            'actor-briefing'              => 'skill_01LGkRnY9Xt5ZfWWUBURRuRS',
            'narrative-synthesis'         => 'skill_01W87BsbQEQYWYaeEHNJfS3L',
            'distil-document-pipeline'    => 'skill_01UqDWjNYrvpB7pS1jMLm5cu',
            'pre-composition-briefing'    => 'skill_018jUyfCGchZbkR6QNyTFqHU',
        ]);

        DB::table('tenant_ai_configs')->update(['skill_ids' => $skillIds]);
    }

    public function down(): void
    {
        Schema::table('tenant_ai_configs', function (Blueprint $table) {
            $table->dropColumn('skill_ids');
        });
    }
};
