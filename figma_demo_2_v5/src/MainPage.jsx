import React, { useState } from 'react';
import {
	Menu, ChevronDown, Search, Bell, LayoutGrid, Globe, MapPin, Check
} from 'lucide-react';
import AISearchHero from './components/AISearchHero';

// --- Icon Components ---
const PulseLogo = () => (
	<svg className="w-7 h-7 mr-2" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-label="Pulse Logo" role="img">
		<path d="M10 80 L100 10 L190 80 L170 100 L100 40 L30 100 Z" fill="#44B8F3" />
		<rect x="40" y="85" width="120" height="105" fill="#122F65" rx="6" />
		<rect x="85" y="115" width="30" height="45" fill="#ffffff" opacity="0.10" />
	</svg>
);

const Avatar = ({ userInfo }) => {
	const getInitials = () => {
		if (!userInfo) return 'U';
		if (userInfo.given_name && userInfo.family_name) {
			return `${userInfo.given_name[0]}${userInfo.family_name[0]}`.toUpperCase();
		}
		if (userInfo.name) {
			const nameParts = userInfo.name.split(' ');
			if (nameParts.length >= 2) {
				return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
			}
			return userInfo.name[0].toUpperCase();
		}
		return 'U';
	};

	return (
		<div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white/50 bg-blue-400 flex items-center justify-center text-sm font-semibold text-white">
			{getInitials()}
		</div>
	);
};

const newsItems = [
	{ id: 1, tag: 'NEW', title: 'Carelon Impact Ambassadors Program (CIAP) begins recruitment for 2024!', time: '1 min ago' },
	{ id: 2, tag: 'UPDATE', title: 'Workplace Safety: Refresher Training mandatory for all employees.', time: '2 hours ago' },
	{ id: 3, tag: 'SPOTLIGHT', title: 'Celebrating Jane Doe: Q3 Top Performer in Sales.', time: 'Yesterday' },
	{ id: 4, tag: 'NEW', title: 'Launch of the new Mental Wellness Resource Hub.', time: '1 day ago' },
];

const PrimaryNavbar = ({ userInfo }) => (
	<header className="bg-white/95 backdrop-blur-sm shadow-md border-b border-gray-200 sticky top-0 z-10">
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
			<div className="flex items-center space-x-6">
				<a href="#" className="flex items-center font-bold text-lg text-[#122F65]">
					<PulseLogo />
					<span className="ml-1 tracking-wide">Pulse</span>
				</a>
				{[
					'Our Company', 'Our Focus', 'Our Initiatives', 'Our Resources'
				].map(item => (
					<a key={item} href="#" className="hidden lg:flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600 group">
						{item}
						<ChevronDown className="w-3 h-3 ml-1 text-gray-400 group-hover:text-indigo-600 transition-colors" />
					</a>
				))}
			</div>

			<div className="flex items-center space-x-6">
				<div className="hidden sm:flex items-center text-sm font-semibold">
					<span className="text-gray-600 mr-1">ELV</span>
					<span className="text-indigo-600">467.86</span>
					<span className="text-green-500 ml-2">3.23</span>
				</div>

				<Search className="w-5 h-5 text-gray-500 hover:text-indigo-600 cursor-pointer" />
				<Bell className="w-5 h-5 text-gray-500 hover:text-indigo-600 cursor-pointer" />

				<div className="hidden sm:flex items-center space-x-4">
					<a href="#" className="text-sm font-medium text-gray-700 hover:text-indigo-600">My HR</a>
					<div className="border-l border-gray-300 h-6"></div>
					<a 
						href="/pulsemain" 
						className="text-sm font-medium text-blue-600 hover:text-blue-800 font-semibold"
						onClick={(e) => {
							e.preventDefault();
							window.history.pushState({}, '', '/pulsemain');
							window.location.reload();
						}}
					>
						PulseMain
					</a>
					<div className="border-l border-gray-300 h-6"></div>
					<a href="#" className="text-sm font-medium text-gray-700 hover:text-indigo-600 flex items-center">
						<Globe className="w-4 h-4 mr-1" />
						Español
					</a>
				</div>

				<a href="#" className="flex items-center space-x-2">
					<span className="hidden sm:block text-sm font-medium text-gray-700">
						{userInfo?.given_name || userInfo?.name?.split(' ')[0] || 'User'}
					</span>
					<Avatar userInfo={userInfo} />
				</a>
			</div>
		</div>
	</header>
);

const MainContentLayout = () => (
	<div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
		<div className="grid lg:grid-cols-3 gap-8">
			<div className="lg:col-span-2">
				<FeaturedStoryCard />
				<NewsFeed />
			</div>

			<div className="lg:col-span-1 space-y-8">
				<RemindersCard />
				<AtAGlanceCard />
			</div>
		</div>
	</div>
);

const FeaturedStoryCard = () => (
	<div className="relative mb-8 bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
		<div className="relative h-48 sm:h-64 overflow-hidden">
			<img
				src="https://placehold.co/1200x600/1e40af/ffffff?text=AI-Powered+Search+Live"
				alt="Feature"
				className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
				onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://placehold.co/1200x600/1e40af/ffffff?text=Image+Not+Available"; }}
			/>
			<div className="absolute top-4 left-4 flex space-x-2">
				<span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-md">NEW</span>
			</div>
		</div>

		<div className="p-6">
			<div className="flex items-center mb-2">
				<span className="text-xs font-semibold text-blue-600 uppercase tracking-widest px-2 py-0.5 bg-blue-100 rounded">FEATURED STORY</span>
			</div>
			<h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 leading-tight">
				AI-Powered Search Now Live in Pulse — Find What You Need Instantly
			</h2>
			<p className="text-sm text-gray-500">
				Oct 8 • 4 hours ago
			</p>
		</div>
	</div>
);

const NewsFeed = () => {
	const [activeTab, setActiveTab] = useState('enterprise');

	return (
		<div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
			<div className="flex border-b border-gray-200 mb-6">
				<TabButton name="Enterprise News" id="enterprise" activeTab={activeTab} setActiveTab={setActiveTab} />
				<TabButton name="My News" id="my" activeTab={activeTab} setActiveTab={setActiveTab} />
			</div>

			<div className="flex items-center justify-between space-x-4 mb-6">
				<div className="relative flex-grow">
					<Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
					<input
						type="text"
						placeholder="Search for News"
						className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 transition-shadow"
					/>
				</div>
				<div className="flex space-x-2 text-gray-500">
					<button className="p-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
						<Menu className="w-5 h-5" />
					</button>
					<button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
						<LayoutGrid className="w-5 h-5" />
					</button>
				</div>
			</div>

			<div className="space-y-4">
				{newsItems.map(item => (
					<NewsItem key={item.id} {...item} />
				))}
				<div className="pt-4 text-center">
						<button className="text-blue-600 font-medium hover:text-blue-800 transition-colors">
								Load More News
						</button>
				</div>
			</div>
		</div>
	);
};

const TabButton = ({ name, id, activeTab, setActiveTab }) => (
	<button
		onClick={() => setActiveTab(id)}
		className={`pb-3 mr-6 text-base font-medium transition-colors ${
			activeTab === id
				? 'text-blue-600 border-b-2 border-blue-600'
				: 'text-gray-500 hover:text-gray-700'
		}`}
	>
		{name}
	</button>
);

const NewsItem = ({ tag, title, time }) => (
	<a href="#" className="flex items-start p-4 hover:bg-gray-50 transition-colors rounded-lg border-b border-gray-100 last:border-b-0">
		<div className="flex-shrink-0 mr-4 mt-1">
			<span className={`text-xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
				tag === 'NEW' ? 'bg-indigo-600 text-white' : tag === 'UPDATE' ? 'bg-yellow-500 text-white' : 'bg-gray-200 text-gray-800'
			}`}>
				{tag}
			</span>
		</div>
		<div className="flex-grow">
			<p className="text-gray-800 font-medium hover:text-blue-600 transition-colors">{title}</p>
			<p className="text-xs text-gray-500 mt-1">{time}</p>
		</div>
	</a>
);

const RemindersCard = () => (
	<div className="bg-[#F0F8FF] rounded-xl p-6 shadow-md border border-blue-200">
		<div className="flex justify-between items-center mb-4">
			<h3 className="text-lg font-semibold text-gray-800">Todays Reminders</h3>
			<a href="#" className="text-sm text-blue-600 font-medium hover:text-blue-800 transition-colors">View More</a>
		</div>

		<div className="space-y-4">
			<ReminderItem
				text="Don't forget to enroll in your benefits!"
				linkText="Enroll Now"
				date="OCT 2"
				isUrgent={true}
			/>
			<ReminderItem
				text="Complete Peakon Employee Survey"
				linkText="Complete Survey"
				date="OCT 4"
				isUrgent={false}
			/>
		</div>
	</div>
);

const ReminderItem = ({ text, linkText, date, isUrgent }) => (
	<div className="flex justify-between items-start border-t border-blue-200 pt-4">
		<div className="flex-grow pr-4">
			<p className="text-gray-800 leading-snug">{text}</p>
			<a href="#" className="text-sm text-blue-600 hover:underline mt-1 block">
				{linkText}
			</a>
		</div>
		<div className={`text-right ${isUrgent ? 'text-orange-600' : 'text-gray-500'}`}>
			<span className={`text-sm font-bold px-2 py-1 rounded-md ${isUrgent ? 'bg-orange-100' : 'bg-gray-100'} shadow-sm`}>{date}</span>
		</div>
	</div>
);

const AtAGlanceCard = () => (
	<div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
		<h3 className="text-lg font-semibold text-gray-800 mb-4">Today at a Glance <span className="text-sm font-normal text-gray-500">(09/12)</span></h3>

		<div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
			<h4 className="font-semibold text-gray-800 mb-2 flex items-center">
				<MapPin className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
				PulsePoint Reservation
			</h4>
			<div className="pl-7 space-y-2 text-sm">
				<p className="text-gray-700">740 W. Peachtree Street</p>
				<p className="text-gray-500 text-xs">Atlanta, GA</p>

				<div className="flex items-center justify-between pt-2 border-t border-gray-200">
					<p className="text-gray-700 flex items-center">
						<Check className="w-4 h-4 text-green-500 mr-1" />
						Workstation 1-15A-135 <span className="text-xs text-blue-600 ml-2 font-medium">All day</span>
					</p>
					<a href="#" className="text-blue-600 font-medium hover:text-blue-800 transition-colors text-sm">Check in</a>
				</div>
			</div>
		</div>
	</div>
);

const MainPage = ({ onSearch, userInfo }) => {
	const handleSearch = (question, conversationId = null, type = null) => {
		if (onSearch) onSearch(question, conversationId, type);
	};

	return (
		<div className="font-sans min-h-screen bg-gray-50">
			<PrimaryNavbar userInfo={userInfo} />
			<AISearchHero onSearch={handleSearch} />
			<MainContentLayout />
		</div>
	);
};

export default MainPage;
