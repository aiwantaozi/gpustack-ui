import { useIntl } from '@umijs/max';
import { Alert } from 'antd';
import ModelLoraList from './model-lora-list';

/**
 * The settings a group's roles cannot tell apart.
 *
 * Computed, not curated: these are the fields on `ModelSpecBase` that
 * `RoleSpec` does not carry, so `role_effective_model` has nothing to project
 * and every role runs the model's value. That is a schema fact, and until the
 * schema changes the honest thing is to stop presenting them as neutral
 * knobs of "this deployment" and say plainly that one value lands on two
 * different workloads.
 *
 * They lived in Performance and Advanced, where nothing distinguished them
 * from the per-role settings beside them — a speculative-decoding checkbox in
 * a section called "Performance" reads as a performance dial, not as
 * something that will also be applied to a role that never decodes.
 *
 * ⚠️ Speculative decoding was in here and has been taken out. The reasoning
 * that put it here — "prefill does not decode, so this is one value across two
 * workloads and one of them cannot use it" — was checked and is backwards
 * (open-questions F17): the NIXL handshake hashes the *model*, and an
 * MTP draft head is part of the model, so a prefill that skips it fails the
 * check. Prefill and decode need different values, which makes it a per-role
 * field rather than a group one. It now lives in the role's own sections.
 *
 * The lesson this block should keep: state what is known — one value, two
 * roles — and do not annotate it with a guess about which role suffers.
 */
const GroupSettings: React.FC = () => {
  const intl = useIntl();

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={intl.formatMessage({ id: 'models.form.groupSettings.tips' })}
      />
      <ModelLoraList></ModelLoraList>
    </>
  );
};

export default GroupSettings;
