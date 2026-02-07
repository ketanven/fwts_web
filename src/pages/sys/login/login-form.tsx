import type { SignInReq } from "@/api/services/userService";
import { GLOBAL_CONFIG } from "@/global-config";
import { useSignIn } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Checkbox } from "@/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { cn } from "@/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Icon } from "@/components/icon";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"form">) {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);
	const [remember, setRemember] = useState(true);
	const navigatge = useNavigate();

	const { loginState, setLoginState } = useLoginStateContext();
	const signIn = useSignIn();

	const form = useForm<SignInReq>({
		defaultValues: {
			email: "",
			password: "",
		},
	});

	if (loginState !== LoginStateEnum.LOGIN) return null;

	const handleFinish = async (values: SignInReq) => {
		setLoading(true);
		try {
			await signIn(values);
			navigatge(GLOBAL_CONFIG.defaultRoute, { replace: true });
			toast.success(t("sys.login.loginSuccessTitle"), {
				closeButton: true,
			});
		} catch (err: any) {
			const message = err?.response?.data?.message || err?.message || t("sys.api.errorMessage");
			form.setError("password", { type: "manual", message });
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={cn("flex flex-col gap-6", className)}>
			<Form {...form} {...props}>
				<form onSubmit={form.handleSubmit(handleFinish)} className="space-y-4">
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="text-2xl font-bold">{t("sys.login.signInFormTitle")}</h1>
						<p className="text-balance text-sm text-muted-foreground">{t("sys.login.signInFormDescription")}</p>
					</div>

					<FormField
						control={form.control}
						name="email"
						rules={{ required: t("sys.login.emailPlaceholder") }}
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("sys.login.email")}</FormLabel>
								<FormControl>
									<Input type="email" placeholder={t("sys.login.email")} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="password"
						rules={{ required: t("sys.login.passwordPlaceholder") }}
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("sys.login.password")}</FormLabel>
								<FormControl>
									<Input type="password" placeholder={t("sys.login.password")} {...field} suppressHydrationWarning />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					{/* 记住我/忘记密码 */}
					<div className="flex flex-row justify-between">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="remember"
								checked={remember}
								onCheckedChange={(checked) => setRemember(checked === "indeterminate" ? false : checked)}
							/>
							<label
								htmlFor="remember"
								className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								{t("sys.login.rememberMe")}
							</label>
						</div>
						<Button variant="link" onClick={() => setLoginState(LoginStateEnum.RESET_PASSWORD)} size="sm">
							{t("sys.login.forgetPassword")}
						</Button>
					</div>

					{/* 登录按钮 */}
					<Button type="submit" className="w-full">
						{loading && <Loader2 className="animate-spin mr-2" />}
						{t("sys.login.loginButton")}
					</Button>

					<Button
						variant="link"
						className="w-full cursor-pointer text-accent-foreground"
						onClick={() => setLoginState(LoginStateEnum.REGISTER)}
					>
						<span className="text-sm">{t("sys.login.signUp")}</span>
						<Icon icon="solar:arrow-right-linear" size={20} />
					</Button>
				</form>
			</Form>
		</div>
	);
}

export default LoginForm;
