	.text
	.cstring
lC0:
	.ascii "hi.f90\0"
	.const
lC1:
	.ascii "Hello World"
	.text
	.p2align 4
_MAIN__:
LFB0:
	pushq	%rbp
LCFI0:
	pushq	%rbx
LCFI1:
	subq	$552, %rsp
LCFI2:
	movq	___stack_chk_guard@GOTPCREL(%rip), %rbx
	movq	%rsp, %rbp
	movl	$3, 16(%rsp)
	movq	%rbp, %rdi
	movq	(%rbx), %rax
	movq	%rax, 536(%rsp)
	xorl	%eax, %eax
	leaq	lC0(%rip), %rax
	movq	%rax, 8(%rsp)
	movabsq	$25769803904, %rax
	movq	%rax, (%rsp)
	call	__gfortran_st_write
	movl	$4, %edx
	movq	%rbp, %rdi
	leaq	_i.3871(%rip), %rsi
	call	__gfortran_transfer_integer_write
	movl	$11, %edx
	movq	%rbp, %rdi
	leaq	lC1(%rip), %rsi
	call	__gfortran_transfer_character_write
	movq	%rbp, %rdi
	call	__gfortran_st_write_done
	movq	536(%rsp), %rax
	xorq	(%rbx), %rax
	jne	L5
	addq	$552, %rsp
LCFI3:
	popq	%rbx
LCFI4:
	popq	%rbp
LCFI5:
	ret
L5:
LCFI6:
	call	___stack_chk_fail
LFE0:
	.section __TEXT,__text_startup,regular,pure_instructions
	.p2align 4
	.globl _main
_main:
LFB1:
	subq	$8, %rsp
LCFI7:
	call	__gfortran_set_args
	leaq	_options.1.3877(%rip), %rsi
	movl	$7, %edi
	call	__gfortran_set_options
	call	_MAIN__
	xorl	%eax, %eax
	addq	$8, %rsp
LCFI8:
	ret
LFE1:
	.data
	.align 2
_i.3871:
	.long	3
	.const
	.align 4
_options.1.3877:
	.long	2116
	.long	4095
	.long	0
	.long	1
	.long	1
	.long	0
	.long	31
	.section __TEXT,__eh_frame,coalesced,no_toc+strip_static_syms+live_support
EH_frame1:
	.set L$set$0,LECIE1-LSCIE1
	.long L$set$0
LSCIE1:
	.long	0
	.byte	0x1
	.ascii "zR\0"
	.byte	0x1
	.byte	0x78
	.byte	0x10
	.byte	0x1
	.byte	0x10
	.byte	0xc
	.byte	0x7
	.byte	0x8
	.byte	0x90
	.byte	0x1
	.align 3
LECIE1:
LSFDE1:
	.set L$set$1,LEFDE1-LASFDE1
	.long L$set$1
LASFDE1:
	.long	LASFDE1-EH_frame1
	.quad	LFB0-.
	.set L$set$2,LFE0-LFB0
	.quad L$set$2
	.byte	0
	.byte	0x4
	.set L$set$3,LCFI0-LFB0
	.long L$set$3
	.byte	0xe
	.byte	0x10
	.byte	0x86
	.byte	0x2
	.byte	0x4
	.set L$set$4,LCFI1-LCFI0
	.long L$set$4
	.byte	0xe
	.byte	0x18
	.byte	0x83
	.byte	0x3
	.byte	0x4
	.set L$set$5,LCFI2-LCFI1
	.long L$set$5
	.byte	0xe
	.byte	0xc0,0x4
	.byte	0x4
	.set L$set$6,LCFI3-LCFI2
	.long L$set$6
	.byte	0xa
	.byte	0xe
	.byte	0x18
	.byte	0x4
	.set L$set$7,LCFI4-LCFI3
	.long L$set$7
	.byte	0xe
	.byte	0x10
	.byte	0x4
	.set L$set$8,LCFI5-LCFI4
	.long L$set$8
	.byte	0xe
	.byte	0x8
	.byte	0x4
	.set L$set$9,LCFI6-LCFI5
	.long L$set$9
	.byte	0xb
	.align 3
LEFDE1:
LSFDE3:
	.set L$set$10,LEFDE3-LASFDE3
	.long L$set$10
LASFDE3:
	.long	LASFDE3-EH_frame1
	.quad	LFB1-.
	.set L$set$11,LFE1-LFB1
	.quad L$set$11
	.byte	0
	.byte	0x4
	.set L$set$12,LCFI7-LFB1
	.long L$set$12
	.byte	0xe
	.byte	0x10
	.byte	0x4
	.set L$set$13,LCFI8-LCFI7
	.long L$set$13
	.byte	0xe
	.byte	0x8
	.align 3
LEFDE3:
	.ident	"GCC: (GNU) 9.3.0"
	.subsections_via_symbols
