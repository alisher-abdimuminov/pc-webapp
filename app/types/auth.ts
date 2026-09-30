export type Role = "admin" | "teacher" | "student";

export interface User {
	uuid: string;
	username: string;

	first_name: string;
	second_name: string;
	third_name: string;
	full_name: string;
	short_name: string;

	image: string;
	image_url: string;
	birth_date: string;
	email: string;
	phone: string;
	passport_pin: string;
	passport_number: string;
	gender: string;
	payment_form: string;

	group: number;
	group_name: string;
	faculty: number;
	faculty_name: string;
	level: string;
	smester: string;
	gpa: number;

	address: string;
	country: string;
	province: string;
	district: string;

	role: Role;
	created_at: string;
	is_active: boolean;
}
