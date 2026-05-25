import { Modal } from "./Modal";
import { Button } from "./Button";
import { useConfirm } from "@state/confirm.store";

/** Mount once at the app root. Renders the active confirm dialog (if any). */
export function ConfirmHost(): JSX.Element | null {
  const request = useConfirm((s) => s.request);
  const resolve = useConfirm((s) => s.resolve);
  if (!request) return null;
  return (
    <Modal
      open={true}
      onClose={() => resolve(false)}
      title={request.title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => resolve(false)}>
            {request.cancelLabel}
          </Button>
          <Button
            variant={request.destructive ? "danger" : "primary"}
            onClick={() => resolve(true)}
            autoFocus
          >
            {request.confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg/90">{request.message}</p>
    </Modal>
  );
}
