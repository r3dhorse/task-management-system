"use client";

import { useState, useEffect } from "react";
import { SignInCard } from "./sign-in-card";

export const ReadyForWorkLogin = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center relative">
        <div className="text-center space-y-8 relative z-10">
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tight">
              <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent drop-shadow-2xl">
                Begin Your Workday
              </span>
            </h1>
          </div>
          <p className="text-xl md:text-2xl text-white/80 font-light max-w-2xl mx-auto leading-relaxed drop-shadow-lg">
            Optimize workflows, organize tasks with clarity, and drive team success.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center relative">
      {/* Background decorative elements for task management theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/20 rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-white/30 rounded-full animate-pulse delay-500"></div>
        <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-white/25 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-white/20 rounded-full animate-pulse delay-1500"></div>
        
        {/* Task management inspired connecting lines */}
        <div className="absolute top-1/4 left-1/4 w-32 h-px bg-gradient-to-r from-white/10 to-transparent animate-pulse delay-2000"></div>
        <div className="absolute top-1/3 right-1/3 w-24 h-px bg-gradient-to-l from-white/10 to-transparent animate-pulse delay-2500 rotate-45"></div>
        <div className="absolute bottom-1/4 left-1/3 w-20 h-px bg-gradient-to-r from-white/10 to-transparent animate-pulse delay-3000 -rotate-45"></div>
      </div>

      {!showLogin ? (
        <div className="text-center space-y-8 relative z-10">
          {/* Main heading */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-bold text-white tracking-tight">
              <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent drop-shadow-2xl">
                Begin Your Workday
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-white/80 font-light max-w-2xl mx-auto leading-relaxed drop-shadow-lg">
            Optimize workflows, organize tasks with clarity, and drive team success.
          </p>

          {/* Interactive button */}
          <div className="pt-8">
            <button
              onClick={() => setShowLogin(true)}
              className="group relative px-12 py-6 text-xl font-semibold text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 hover:border-white/30 transition-all duration-300 hover:scale-105 active:scale-95 shadow-2xl hover:shadow-white/10"
            >
              <span className="relative z-10 flex items-center gap-3">
                Let&apos;s Get Started
                <svg 
                  className="w-6 h-6 transition-transform duration-300 group-hover:translate-x-1" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
              
              {/* Glassmorphism effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-white/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>

          {/* Feature highlights */}
          <div className="pt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center space-y-2 p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Task Organization</h3>
              <p className="text-sm text-white/70">Organize and prioritize your work with intuitive task management</p>
            </div>
            
            <div className="text-center space-y-2 p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-400/20 to-blue-400/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Team Collaboration</h3>
              <p className="text-sm text-white/70">Work together seamlessly with real-time collaboration features</p>
            </div>
            
            <div className="text-center space-y-2 p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-400/20 to-pink-400/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Progress Tracking</h3>
              <p className="text-sm text-white/70">Monitor progress and stay on top of deadlines with smart analytics</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-md mx-auto">
          {/* Back button */}
          <button
            onClick={() => setShowLogin(false)}
            className="mb-6 flex items-center gap-2 text-white/70 hover:text-white transition-colors duration-200 group"
          >
            <svg 
              className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-1" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          
          {/* Enhanced login card */}
          <div className="transform transition-all duration-500 ease-out animate-in slide-in-from-bottom-4 fade-in">
            <SignInCard />
          </div>
        </div>
      )}
    </div>
  );
};