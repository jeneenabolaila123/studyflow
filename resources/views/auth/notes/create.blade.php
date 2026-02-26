<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            Create Note
        </h2>
    </x-slot>

    <div class="py-8">
        <div class="max-w-3xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white p-6 rounded shadow">

                <form method="POST" action="{{ route('notes.store') }}">
                    @csrf

                    <div class="mb-4">
                        <label class="block text-sm font-medium">Title</label>
                        <input
                            type="text"
                            name="title"
                            class="mt-1 w-full border rounded p-2"
                            value="{{ old('title') }}"
                            required
                        >
                        @error('title')
                            <p class="text-red-600 text-sm mt-1">{{ $message }}</p>
                        @enderror
                    </div>

                    <div class="mb-4">
                        <label class="block text-sm font-medium">Paste Text</label>
                        <textarea
                            name="content"
                            rows="10"
                            class="mt-1 w-full border rounded p-2"
                            required
                        >{{ old('content') }}</textarea>
                        @error('content')
                            <p class="text-red-600 text-sm mt-1">{{ $message }}</p>
                        @enderror
                    </div>

                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded">
                        Save Note
                    </button>
                </form>

            </div>
        </div>
    </div>
</x-app-layout>