import { useIntl } from '@umijs/max';
import { useMemoizedFn } from 'ahooks';
import { App, message } from 'antd';
import { restartModel } from '../apis';
import { modelReplicaCounts } from '../config';
import { ListItem } from '../config/types';

/**
 * "Make the current configuration take effect", as an action on a model row.
 *
 * Three outcomes and three different sentences, only one of which is a failure.
 * The endpoint is idempotent on the target spec, so a model already running it
 * answers 200 with `restarted: false` — reporting that in red would teach
 * people the button is broken when in fact there was nothing to do. A 409 is
 * the other non-failure: a restart is mid-flight and a second teardown would
 * delete the replacements the first one just created, so it is a "wait", not a
 * fault.
 */
const useRestartModel = (options?: { onSuccess?: (row: ListItem) => void }) => {
  const intl = useIntl();
  // Not the static `Modal`: that renders outside the app's ConfigProvider and
  // ignores the dark algorithm and the locale. See layouts/index.tsx.
  const { modal } = App.useApp();

  const handleRestartModel = useMemoizedFn(async (row: ListItem) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      modal.confirm({
        title: intl.formatMessage({ id: 'models.restart' }),
        content: intl.formatMessage(
          { id: 'models.restart.confirm' },
          // The declared size of the group, router included — the same sum the
          // list's replica column shows, so the confirmation and the row the
          // user is looking at cannot disagree. A plain model degenerates to
          // `replicas`.
          { name: row.name, total: modelReplicaCounts(row).total }
        ),
        okText: intl.formatMessage({ id: 'models.restart' }),
        onOk: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
    if (!confirmed) {
      return;
    }

    try {
      const result = await restartModel(row.id as number);
      if (result?.restarted) {
        message.success(intl.formatMessage({ id: 'models.restart.done' }));
        options?.onSuccess?.(row);
        return;
      }
      // The server's own sentence when it sent one: it separates "already on
      // this configuration" from "nothing is running", which `restarted:
      // false` alone cannot express.
      message.info(
        result?.message || intl.formatMessage({ id: 'models.restart.uptodate' })
      );
    } catch (error: any) {
      // `restartModel` opts out of the global handler, so every branch below
      // has to end in a message — including the ones we have no wording for.
      if (error?.response?.status === 409) {
        message.warning(
          intl.formatMessage({ id: 'models.restart.inprogress' })
        );
        return;
      }
      message.error(
        error?.response?.data?.message ||
          error?.message ||
          intl.formatMessage({ id: 'models.restart.failed' })
      );
    }
  });

  return { handleRestartModel };
};

export default useRestartModel;
