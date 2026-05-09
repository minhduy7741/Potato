import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProjectsService } from '../projects/projects.service';
export declare class AuthController {
    private readonly authService;
    private readonly projectsService;
    constructor(authService: AuthService, projectsService: ProjectsService);
    register(registerDto: RegisterDto): Promise<{
        user: {
            id: number;
            name: string | null;
            createdAt: Date;
            email: string;
            role: import("@prisma/client").$Enums.Role;
        };
        accessToken: string;
        message: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        user: {
            id: number;
            name: string | null;
            createdAt: Date;
            email: string;
            role: import("@prisma/client").$Enums.Role;
        };
        accessToken: string;
        message: string;
    }>;
    getMe(req: any): Promise<any>;
    changePassword(req: any, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    updateProfile(req: any, dto: UpdateProfileDto): Promise<{
        id: number;
        name: string | null;
        createdAt: Date;
        email: string;
        role: import("@prisma/client").$Enums.Role;
    }>;
    deleteAccount(req: any): Promise<{
        message: string;
    }>;
}
