import { evaluationTargetInstanceAtom } from '@/atoms/evaluation';
import { useNavigate } from '@umijs/max';
import { useAtom } from 'jotai';
import { ModelInstanceListItem } from '../config/types';

export const useEvaluationTargetInstance = () => {
  const [evaluationTargetInstance, setEvaluationTargetInstance] = useAtom(
    evaluationTargetInstanceAtom
  );
  const navigate = useNavigate();

  const runEvaluationOnInstance = (instance: ModelInstanceListItem) => {
    setEvaluationTargetInstance({
      cluster_id: instance.cluster_id,
      model_name: instance.model_name,
      model_id: instance.model_id,
      model_instance_name: instance.name,
      model_instance: [instance.model_name, instance.name]
    });
    navigate('/models/evaluation', {
      state: {
        openCreate: true,
        draftValues: {
          cluster_id: instance.cluster_id,
          model_instance_id: instance.id,
          name: `${instance.model_name} evaluation`,
          suite_id: 'general'
        }
      }
    });
  };

  const clearEvaluationTargetInstance = () => {
    setEvaluationTargetInstance({
      cluster_id: null,
      model_name: '',
      model_id: null,
      model_instance_name: '',
      model_instance: []
    });
  };

  return {
    evaluationTargetInstance,
    clearEvaluationTargetInstance,
    runEvaluationOnInstance
  };
};
