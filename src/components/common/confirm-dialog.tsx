import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Button } from "@/ui/button";
import { Loader2 } from "lucide-react";

type ConfirmDialogProps = {
	open: boolean;
	title: string;
	description?: string;
	confirmText?: string;
	cancelText?: string;
	confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "contrast";
	loading?: boolean;
	onConfirm: () => void;
	onCancel: () => void;
};

export default function ConfirmDialog({
	open,
	title,
	description,
	confirmText = "Yes",
	cancelText = "No",
	confirmVariant = "destructive",
	loading = false,
	onConfirm,
	onCancel,
}: ConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={(nextOpen) => (!nextOpen ? onCancel() : undefined)}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description ? <DialogDescription>{description}</DialogDescription> : null}
				</DialogHeader>
				<DialogFooter>
					<Button type="button" variant="outline" onClick={onCancel}>
						{cancelText}
					</Button>
					<Button type="button" variant={confirmVariant} onClick={onConfirm} disabled={loading}>
						{loading ? <Loader2 className="animate-spin" /> : null}
						{confirmText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
