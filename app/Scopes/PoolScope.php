<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class PoolScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $projectId = request()->get('_vault_project');

        if ($projectId) {
            $builder->where(function (Builder $q) use ($projectId, $model) {
                $q->where($model->getTable() . '.pool', 'commons')
                  ->orWhere(function (Builder $q2) use ($projectId, $model) {
                      $q2->where($model->getTable() . '.pool', 'vault')
                         ->where($model->getTable() . '.project_id', $projectId);
                  });
            });
        } else {
            $builder->where($model->getTable() . '.pool', 'commons');
        }
    }
}
