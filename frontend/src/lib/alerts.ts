import Swal from "sweetalert2";

type ConfirmActionOptions = {
  cancelText: string;
  confirmText: string;
  text?: string;
  title: string;
};

export async function confirmAction({ cancelText, confirmText, text, title }: ConfirmActionOptions) {
  const result = await Swal.fire({
    background: "#10161d",
    buttonsStyling: false,
    cancelButtonText: cancelText,
    color: "#f8fafc",
    confirmButtonText: confirmText,
    customClass: {
      actions: "mt-5 flex items-center justify-center gap-3",
      cancelButton:
        "rounded-md border border-borderSoft bg-background px-4 py-2.5 text-sm font-semibold text-muted transition hover:border-cyan/35 hover:text-text",
      confirmButton:
        "rounded-md border border-rose/35 bg-rose/15 px-4 py-2.5 text-sm font-semibold text-rose transition hover:bg-rose/20",
      htmlContainer: "mt-2 text-sm leading-6 text-muted",
      icon: "mt-5 border-rose/35 text-rose",
      popup:
        "rounded-xl border border-borderSoft bg-panel px-5 pb-5 pt-1 text-text shadow-panel ring-1 ring-white/[0.025]",
      title: "pt-0 text-base font-semibold text-text"
    },
    focusCancel: true,
    icon: "warning",
    reverseButtons: true,
    showCancelButton: true,
    text,
    title
  });

  return result.isConfirmed;
}
