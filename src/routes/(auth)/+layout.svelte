<script lang="ts">
	let { children } = $props();
	let currentSlide = $state(0);
	let imageLoadStates = $state<Record<number, boolean>>({});
	let autoSlideInterval: NodeJS.Timeout | null = null;
	let isPaused = $state(false);

	const slides = [
		{
			image:
				'https://res.cloudinary.com/dpfonnjv3/image/upload/v1751310660/pexels-pavel-danilyuk-8638714_kadqqk.jpg',
			title: 'Some days are loud.',
			description: 'And then there are days like this. Quiet. Soft. Just here.'
		},
		{
			image:
				'https://res.cloudinary.com/dpfonnjv3/image/upload/v1751310657/brooke-cagle-k9XZPpPHDho-unsplash_vwaczp.jpg',
			title: 'You’re not a machine.',
			description: 'You don’t have to be productive right now. Just... breathe.'
		},
		{
			image:
				'https://res.cloudinary.com/dpfonnjv3/image/upload/v1751310653/pexels-ketut-subiyanto-4584496_q4ublj.jpg',
			title: 'Laughter counts too.',
			description: 'Not everything has to mean something. A good laugh is enough.'
		},
		{
			image:
				'https://res.cloudinary.com/dpfonnjv3/image/upload/v1751311001/portrait-black-woman-and-happiness-on-wall-casua-2025-04-06-04-28-16-utc_mllxvr.jpg',
			title: 'You don’t have to explain.',
			description: 'Whatever you’re feeling — you’re allowed to feel it. That’s it.'
		},
		{
			image:
				'https://res.cloudinary.com/dpfonnjv3/image/upload/v1751310658/pexels-luizclas-170497-1848565_tcqeua.jpg',
			title: 'This isn’t a fix.',
			description: 'But maybe it helps a little to know you’re not weird for struggling.'
		},
		{
			image:
				'https://res.cloudinary.com/dpfonnjv3/image/upload/v1751310662/pexels-olly-712413_wpwu3o.jpg',
			title: 'We’re figuring it out too.',
			description: 'No guidebook. No perfect plan. Just trying things and showing up.'
		},
		{
			image:
				'https://res.cloudinary.com/dpfonnjv3/image/upload/v1751310650/pexels-chetanvlad-2923157_s7d5ky.jpg',
			title: 'And when you’re ready to move...',
			description:
				'We’re here to listen, offer a supportive nudge, and help you find your next small step forward.'
		}
	];

	function goToSlide(index: number) {
		currentSlide = index;
		// Reset auto-slide when user manually changes slide
		startAutoSlide();
	}

	function nextSlide() {
		currentSlide = (currentSlide + 1) % slides.length;
	}

	function startAutoSlide() {
		// Clear existing interval
		if (autoSlideInterval) {
			clearInterval(autoSlideInterval);
		}

		// Start new interval if not paused
		if (!isPaused) {
			autoSlideInterval = setInterval(nextSlide, 8000); // Change slide every 8 seconds
		}
	}

	function pauseAutoSlide() {
		isPaused = true;
		if (autoSlideInterval) {
			clearInterval(autoSlideInterval);
			autoSlideInterval = null;
		}
	}

	function resumeAutoSlide() {
		isPaused = false;
		startAutoSlide();
	}

	function handleImageLoad(index: number) {
		imageLoadStates[index] = true;
	}

	// Start auto-slide when component mounts
	$effect(() => {
		startAutoSlide();

		// Cleanup on unmount
		return () => {
			if (autoSlideInterval) {
				clearInterval(autoSlideInterval);
			}
		};
	});
</script>

<!-- Mobile-first responsive layout -->
<div class="flex min-h-screen w-full flex-col-reverse pt-24 lg:pt-0 bg-white lg:flex-row">
	<!-- Content section - full width on mobile, left half on desktop -->
	<div class="order-2 w-full lg:order-1 lg:w-1/2">
		{@render children()}
	</div>

	<!-- Slider section - full width on mobile, right half on desktop -->
	<div
		class="order-1 h-[50vh] w-full p-4 sm:h-[60vh] sm:p-6 lg:order-2 lg:h-screen lg:w-1/2 lg:p-8"
	>
		<!-- Slider Container -->
		<div
			class="relative h-full w-full overflow-hidden rounded-2xl lg:rounded-4xl"
			onmouseenter={pauseAutoSlide}
			onmouseleave={resumeAutoSlide}
			role="region"
			aria-label="Image carousel"
		>
			<!-- Slides -->
			{#each slides as slide, index}
				<div
					class="absolute inset-0 transition-transform duration-500 ease-in-out"
					style="transform: translateX({(index - currentSlide) * 100}%)"
				>
					<div class="relative h-full w-full">
						<!-- Background Image Container -->
						<div class="relative h-full w-full overflow-hidden">
							<!-- Blur Placeholder -->
							<div
								class="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 transition-opacity duration-700 ease-out"
								class:opacity-0={imageLoadStates[index]}
								class:opacity-100={!imageLoadStates[index]}
								style="filter: blur(20px); transform: scale(1.1);"
							></div>

							<!-- Actual Image -->
							<img
								src={slide.image}
								class="animate-ken-burns absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out"
								class:opacity-0={!imageLoadStates[index]}
								class:opacity-100={imageLoadStates[index]}
								alt="onboarding slide {index + 1}"
								loading={index <= 1 ? 'eager' : 'lazy'}
								onload={() => handleImageLoad(index)}
								onerror={(e) => {
									(e.currentTarget as HTMLImageElement).src =
										`https://via.placeholder.com/1000x800/6366f1/ffffff?text=Image${index + 1}`;
									handleImageLoad(index);
								}}
							/>
						</div>

						<!-- Overlay -->
						<div class="absolute inset-0 bg-black/40"></div>

						<!-- Content -->
						<div
							class="absolute inset-0 mb-4 flex flex-col justify-end p-6 text-white sm:mb-6 sm:p-8 lg:mb-8 lg:p-12"
						>
							<h2
								class="font-outfit transform text-2xl transition-transform duration-700 ease-out sm:text-3xl lg:text-4xl"
								class:translate-y-4={!imageLoadStates[index]}
								class:translate-y-0={imageLoadStates[index]}
								class:opacity-70={!imageLoadStates[index]}
								class:opacity-100={imageLoadStates[index]}
							>
								{slide.title}
							</h2>
							<p
								class="font-inter w-11/12 transform text-xs font-light transition-all delay-100 duration-700 ease-out sm:w-10/12 sm:text-sm lg:text-base"
								class:translate-y-4={!imageLoadStates[index]}
								class:translate-y-0={imageLoadStates[index]}
								class:opacity-70={!imageLoadStates[index]}
								class:opacity-100={imageLoadStates[index]}
							>
								{slide.description}
							</p>
						</div>
					</div>
				</div>
			{/each}

			<!-- Slide Indicators -->
			<div
				class="absolute bottom-4 left-1/2 flex -translate-x-1/2 space-x-2 sm:bottom-6 sm:space-x-3"
			>
				{#each slides as _, index}
					<button
						onclick={() => goToSlide(index)}
						aria-label={`Go to slide ${index + 1}`}
						class="h-2 w-2 rounded-full transition-all duration-200 sm:h-3 sm:w-3 {currentSlide ===
						index
							? 'bg-white'
							: 'bg-white/50'}"
					></button>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	@keyframes ken-burns {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.03);
		}
		100% {
			transform: scale(1.06);
		}
	}

	@keyframes ken-burns-reverse {
		0% {
			transform: scale(1.06);
		}
		50% {
			transform: scale(1.03);
		}
		100% {
			transform: scale(1);
		}
	}

	.animate-ken-burns {
		animation: ken-burns 20s ease-in-out infinite alternate;
	}

	.animate-ken-burns:nth-child(even) {
		animation: ken-burns-reverse 18s ease-in-out infinite alternate;
		animation-delay: -2s;
	}
</style>
