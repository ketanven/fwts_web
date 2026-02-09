import Logo from "@/components/logo";
import { GLOBAL_CONFIG } from "@/global-config";
import SettingButton from "@/layouts/components/setting-button";
import { useUserToken } from "@/store/userStore";
import { Navigate, useNavigate } from "react-router";
import RegisterForm from "../login/register-form";
import { LoginProvider, LoginStateEnum } from "../login/providers/login-provider";

function RegisterPage() {
	const token = useUserToken();
	const navigate = useNavigate();

	if (token.accessToken) {
		return <Navigate to={GLOBAL_CONFIG.defaultRoute} replace />;
	}

	return (
		<div className="group relative grid min-h-svh lg:grid-cols-2 bg-background">
			<div className="flex flex-col gap-4 p-6 md:p-10">
				<div className="flex justify-center gap-2 md:justify-start">
					<div className="flex items-center gap-2 font-medium cursor-pointer" onClick={() => navigate("/login")}>
						<Logo size={28} />
						<span>{GLOBAL_CONFIG.appName}</span>
					</div>
				</div>
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-xs">
						<LoginProvider initialState={LoginStateEnum.REGISTER}>
							<RegisterForm />
						</LoginProvider>
					</div>
				</div>
			</div>

			<div className="relative hidden bg-background-paper lg:block">
				<img src="/freelancer.jpg" alt="freelancer" className="absolute inset-0 h-full w-full object-cover object-center" />
				<div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/30 to-transparent" />
			</div>

			<div className="absolute right-2 top-0 flex flex-row opacity-0 transition-opacity duration-200 group-hover:opacity-100">
				<SettingButton />
			</div>
		</div>
	);
}

export default RegisterPage;
