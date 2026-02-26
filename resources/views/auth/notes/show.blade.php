<x-app-layout>
    <x-slot name="header">
        <h2 class="font-semibold text-xl text-gray-800 leading-tight">
            {{ $note->title }}
        </h2>
    </x-slot>

    <div class="py-8">
        <div class="max-w-5xl mx-auto sm:px-6 lg:px-8">
            <div class="bg-white p-6 rounded shadow">
                <h3 class="font-semibold text-lg mb-2">Your Notes</h3>
                <pre class="whitespace-pre-wrap text-sm text-gray-700">
{{ $note->content }}
                </pre>
            </div>
        </div>
    </div>
</x-app-layout>